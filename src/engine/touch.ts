import {
  TOUCH_BUTTON_BG_ACTIVE_COLOR,
  TOUCH_BUTTON_BG_COLOR,
  TOUCH_BUTTON_BORDER_COLOR,
  TOUCH_BUTTON_FONT_FRAC,
  TOUCH_BUTTON_GAP_FRAC,
  TOUCH_BUTTON_ICON_COLOR,
  TOUCH_BUTTON_MARGIN_FRAC,
  TOUCH_BUTTON_SIZE_FRAC,
  TOUCH_JOYSTICK_BG_COLOR,
  TOUCH_JOYSTICK_BORDER_COLOR,
  TOUCH_JOYSTICK_DEADZONE_FRAC,
  TOUCH_JOYSTICK_KNOB_COLOR,
  TOUCH_JOYSTICK_KNOB_FRAC,
  TOUCH_JOYSTICK_RADIUS_FRAC,
  TOUCH_MENU_BUTTON_MARGIN_FRAC,
  TOUCH_MENU_BUTTON_SIZE_FRAC,
  TOUCH_RIGHT_ZONE_START_FRAC,
} from "../config";
import { hotbarSlotIndexAt, hotbarTopY } from "../ui/hud";

type ButtonKind = "left" | "right" | "jump" | "crouch";

interface ButtonRect {
  kind: ButtonKind;
  x: number;
  y: number;
  size: number;
}

type TouchRole = { kind: "button"; button: ButtonKind } | { kind: "hotbar" } | { kind: "aim" } | { kind: "menu" };

// Controles de toque estilo Terraria mobile: botões de movimento/pulo/agachar à esquerda
// (segurar = ativo; agachar é toggle) e joystick flutuante de mira à direita (mineração/
// construção contínuas na direção apontada). Só se ativa em dispositivos com tela de toque;
// em desktop (sem toque) a classe fica inerte e nada muda no jogo.
export class TouchControls {
  readonly enabled: boolean;

  left = false;
  right = false;
  jump = false;
  crouch = false; // toggle: um toque agacha, outro levanta

  aimActive = false;
  aimDirX = 0;
  aimDirY = 0;

  private aimTouchId: number | null = null;
  private aimOriginX = 0;
  private aimOriginY = 0;
  private aimCurX = 0;
  private aimCurY = 0;

  private pendingHotbarSelect: number | null = null;
  private readonly touchRoles = new Map<number, TouchRole>();
  private readonly buttonTouchCount: Record<ButtonKind, number> = { left: 0, right: 0, jump: 0, crouch: 0 };

  // botão discreto (canto superior direito) que abre/fecha o menu de save;
  // enquanto o menu está aberto, todo outro toque é tratado como clique nele
  // em vez de gameplay (movimento/hotbar/mira ficam inertes)
  private menuOpen = false;
  private menuButtonPending = false;
  private menuTapPos: { x: number; y: number } | null = null;

  setMenuOpen(open: boolean): void {
    this.menuOpen = open;
  }

  consumeMenuButtonTap(): boolean {
    const pending = this.menuButtonPending;
    this.menuButtonPending = false;
    return pending;
  }

  consumeMenuTapPos(): { x: number; y: number } | null {
    const pos = this.menuTapPos;
    this.menuTapPos = null;
    return pos;
  }

  private menuButtonRect(): { x: number; y: number; size: number } {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_MENU_BUTTON_SIZE_FRAC;
    const margin = unit * TOUCH_MENU_BUTTON_MARGIN_FRAC;
    return { x: window.innerWidth - margin - size, y: margin, size };
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.enabled = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!this.enabled) return;

    canvas.style.touchAction = "none";
    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener("touchcancel", (e) => this.onTouchEnd(e), { passive: false });
  }

  // consome a seleção de hotbar por toque desde a última chamada (evita processar 2x por frame)
  consumeHotbarSelect(): number | null {
    const idx = this.pendingHotbarSelect;
    this.pendingHotbarSelect = null;
    return idx;
  }

  private viewportUnit(): number {
    return Math.min(window.innerWidth, window.innerHeight);
  }

  private buttonRects(): ButtonRect[] {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_BUTTON_SIZE_FRAC;
    const gap = unit * TOUCH_BUTTON_GAP_FRAC;
    const margin = unit * TOUCH_BUTTON_MARGIN_FRAC;
    // ancorado acima da hotbar (nunca sob o rodapé bruto da tela) pra nunca sobrepor seus slots
    const y = hotbarTopY() - gap - size;
    const kinds: ButtonKind[] = ["left", "right", "jump", "crouch"];
    return kinds.map((kind, i) => ({ kind, x: margin + i * (size + gap), y, size }));
  }

  private buttonAt(x: number, y: number): ButtonKind | null {
    for (const rect of this.buttonRects()) {
      if (x >= rect.x && x <= rect.x + rect.size && y >= rect.y && y <= rect.y + rect.size) return rect.kind;
    }
    return null;
  }

  private touchPos(t: Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const { x, y } = this.touchPos(t);

      const menuBtn = this.menuButtonRect();
      if (x >= menuBtn.x && x <= menuBtn.x + menuBtn.size && y >= menuBtn.y && y <= menuBtn.y + menuBtn.size) {
        this.menuButtonPending = true;
        this.touchRoles.set(t.identifier, { kind: "menu" });
        continue;
      }

      // menu aberto: qualquer outro toque é repassado como clique no menu, gameplay fica inerte
      if (this.menuOpen) {
        this.menuTapPos = { x, y };
        this.touchRoles.set(t.identifier, { kind: "menu" });
        continue;
      }

      const hotbarIdx = hotbarSlotIndexAt(x, y);
      if (hotbarIdx !== null) {
        this.pendingHotbarSelect = hotbarIdx;
        this.touchRoles.set(t.identifier, { kind: "hotbar" });
        continue;
      }

      const btn = this.buttonAt(x, y);
      if (btn) {
        this.touchRoles.set(t.identifier, { kind: "button", button: btn });
        this.buttonTouchCount[btn]++;
        if (btn === "crouch") this.crouch = !this.crouch;
        else if (btn === "left") this.left = true;
        else if (btn === "right") this.right = true;
        else if (btn === "jump") this.jump = true;
        continue;
      }

      if (this.aimTouchId === null && x >= window.innerWidth * TOUCH_RIGHT_ZONE_START_FRAC) {
        this.touchRoles.set(t.identifier, { kind: "aim" });
        this.aimTouchId = t.identifier;
        this.aimOriginX = x;
        this.aimOriginY = y;
        this.aimCurX = x;
        this.aimCurY = y;
        this.aimActive = true;
        this.updateAimVector();
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.aimTouchId) continue;
      const { x, y } = this.touchPos(t);
      this.aimCurX = x;
      this.aimCurY = y;
      this.updateAimVector();
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const role = this.touchRoles.get(t.identifier);
      if (!role) continue;
      this.touchRoles.delete(t.identifier);

      if (role.kind === "button") {
        this.buttonTouchCount[role.button] = Math.max(0, this.buttonTouchCount[role.button] - 1);
        if (this.buttonTouchCount[role.button] > 0) continue;
        if (role.button === "left") this.left = false;
        else if (role.button === "right") this.right = false;
        else if (role.button === "jump") this.jump = false;
        // agachar é toggle: soltar o dedo não faz nada
      } else if (role.kind === "aim" && t.identifier === this.aimTouchId) {
        this.aimTouchId = null;
        this.aimActive = false;
        this.aimDirX = 0;
        this.aimDirY = 0;
      }
    }
  }

  private updateAimVector(): void {
    const maxRadius = this.viewportUnit() * TOUCH_JOYSTICK_RADIUS_FRAC;
    const dx = this.aimCurX - this.aimOriginX;
    const dy = this.aimCurY - this.aimOriginY;
    const dist = Math.hypot(dx, dy);
    const deadzone = maxRadius * TOUCH_JOYSTICK_DEADZONE_FRAC;
    if (dist < deadzone) {
      this.aimDirX = 0;
      this.aimDirY = 0;
      return;
    }
    this.aimDirX = dx / dist;
    this.aimDirY = dy / dist;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;
    this.renderButtons(ctx);
    this.renderJoystick(ctx);
    this.renderMenuButton(ctx);
  }

  private renderMenuButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, size } = this.menuButtonRect();
    ctx.fillStyle = TOUCH_BUTTON_BG_COLOR;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = TOUCH_BUTTON_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    ctx.fillStyle = TOUCH_BUTTON_ICON_COLOR;
    ctx.font = `${Math.round(size * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("☰", x + size / 2, y + size / 2 + 1);
  }

  private renderButtons(ctx: CanvasRenderingContext2D): void {
    const unit = this.viewportUnit();
    ctx.font = `${Math.round(unit * TOUCH_BUTTON_FONT_FRAC)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const icons: Record<ButtonKind, string> = { left: "◀", right: "▶", jump: "⬆", crouch: "⬇" };
    const active: Record<ButtonKind, boolean> = { left: this.left, right: this.right, jump: this.jump, crouch: this.crouch };

    for (const rect of this.buttonRects()) {
      ctx.fillStyle = active[rect.kind] ? TOUCH_BUTTON_BG_ACTIVE_COLOR : TOUCH_BUTTON_BG_COLOR;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      ctx.strokeStyle = TOUCH_BUTTON_BORDER_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.size - 2, rect.size - 2);

      ctx.fillStyle = TOUCH_BUTTON_ICON_COLOR;
      ctx.fillText(icons[rect.kind], rect.x + rect.size / 2, rect.y + rect.size / 2 + 1);
    }
  }

  private renderJoystick(ctx: CanvasRenderingContext2D): void {
    if (!this.aimActive) return;
    const maxRadius = this.viewportUnit() * TOUCH_JOYSTICK_RADIUS_FRAC;
    const knobRadius = maxRadius * TOUCH_JOYSTICK_KNOB_FRAC;

    ctx.beginPath();
    ctx.arc(this.aimOriginX, this.aimOriginY, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = TOUCH_JOYSTICK_BG_COLOR;
    ctx.fill();
    ctx.strokeStyle = TOUCH_JOYSTICK_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    const dx = this.aimCurX - this.aimOriginX;
    const dy = this.aimCurY - this.aimOriginY;
    const dist = Math.min(Math.hypot(dx, dy), maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = this.aimOriginX + Math.cos(angle) * dist;
    const knobY = this.aimOriginY + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = TOUCH_JOYSTICK_KNOB_COLOR;
    ctx.fill();
  }
}
