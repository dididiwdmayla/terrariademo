import {
  TOUCH_BUTTON_BG_ACTIVE_COLOR,
  TOUCH_BUTTON_BG_COLOR,
  TOUCH_BUTTON_BORDER_COLOR,
  TOUCH_BUTTON_FONT_FRAC,
  TOUCH_BUTTON_ICON_COLOR,
  TOUCH_DPAD_BUTTON_SIZE_FRAC,
  TOUCH_DPAD_GAP_FRAC,
  TOUCH_DPAD_MARGIN_FRAC,
  TOUCH_FULLSCREEN_BUTTON_GAP_FRAC,
  TOUCH_FULLSCREEN_BUTTON_SIZE_FRAC,
  TOUCH_JOYSTICK_BG_COLOR,
  TOUCH_JOYSTICK_BORDER_COLOR,
  TOUCH_JOYSTICK_DEADZONE_FRAC,
  TOUCH_JOYSTICK_KNOB_COLOR,
  TOUCH_JOYSTICK_KNOB_FRAC,
  TOUCH_JOYSTICK_RADIUS_FRAC,
  TOUCH_MAGNIFIER_BORDER_COLOR,
  TOUCH_MAGNIFIER_CROSSHAIR_COLOR,
  TOUCH_MAGNIFIER_OFFSET_Y_FRAC,
  TOUCH_MAGNIFIER_RADIUS_FRAC,
  TOUCH_MAGNIFIER_ZOOM,
  TOUCH_MENU_BUTTON_MARGIN_FRAC,
  TOUCH_MENU_BUTTON_SIZE_FRAC,
  TOUCH_PRECISION_ACTIVATION_DELAY,
  TOUCH_RIGHT_ZONE_START_FRAC,
  TOUCH_TAP_MAX_HOLD,
} from "../config";
import { hotbarSlotIndexAt, hotbarTopY } from "../ui/hud";

type ButtonKind = "left" | "right" | "jump" | "crouch";

interface ButtonRect {
  kind: ButtonKind;
  x: number;
  y: number;
  size: number;
}

type TouchRole =
  | { kind: "button"; button: ButtonKind }
  | { kind: "hotbar" }
  | { kind: "aim" }
  | { kind: "menu" }
  | { kind: "world" };

// Controles de toque estilo Terraria mobile:
// - Cluster esquerdo em cruz (D-pad): ◀/▶ nas pontas horizontais, ▲ (pulo) acima
//   e ▼ (agachar, toggle) abaixo, entre os dois — segurar = ativo.
// - Zona direita: joystick flutuante de mira (mineração/construção contínuas na
//   direção apontada).
// - Zona esquerda/central fora do D-pad: modo de precisão — tap rápido age no
//   tile exato do toque; segurar invoca uma lupa que amplia a área sob o dedo
//   (deslocada acima dele) com crosshair, e a ação passa a disparar continuamente
//   no tile do crosshair após um pequeno atraso; arrastar move o alvo.
// Só se ativa em dispositivos com tela de toque; em desktop a classe fica inerte.
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
  // em vez de gameplay (movimento/hotbar/mira/precisão ficam inertes)
  private menuOpen = false;
  private menuButtonPending = false;
  private menuTapPos: { x: number; y: number } | null = null;

  // toque de precisão (tap exato / lupa) na zona esquerda/central, fora do D-pad
  private worldTouchId: number | null = null;
  private worldCurX = 0;
  private worldCurY = 0;
  private worldHeldTime = 0;
  private worldMagnifierActive = false;
  private worldActivationTimer = 0;
  private worldTapPending = false;
  private worldTapX = 0;
  private worldTapY = 0;

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

  // avança os temporizadores do modo de precisão; chamado a cada passo fixo do game loop
  update(dt: number): void {
    if (this.worldTouchId === null) return;
    this.worldHeldTime += dt;
    if (!this.worldMagnifierActive && this.worldHeldTime >= TOUCH_TAP_MAX_HOLD) {
      this.worldMagnifierActive = true;
      this.worldActivationTimer = 0;
    }
    if (this.worldMagnifierActive && this.worldActivationTimer < TOUCH_PRECISION_ACTIVATION_DELAY) {
      this.worldActivationTimer += dt;
    }
  }

  // ponto de tela (px) onde o alvo (crosshair/highlight) deve ser mostrado neste
  // frame, com `active` indicando se a ação (minerar/construir) deve disparar
  // agora. O alvo fica disponível assim que o dedo toca a zona de precisão (evita
  // cair de volta pras coordenadas do mouse enquanto o toque ainda está sendo
  // avaliado como tap ou lupa); `active` só liga no tap (disparo único) ou depois
  // do atraso de ativação da lupa (evita minerar/construir sem querer enquanto o
  // jogador ainda está posicionando o dedo). Null = nenhum toque de precisão em andamento.
  worldActionTarget(): { x: number; y: number; active: boolean } | null {
    if (this.worldTapPending) {
      this.worldTapPending = false;
      return { x: this.worldTapX, y: this.worldTapY, active: true };
    }
    if (this.worldTouchId !== null) {
      const active = this.worldMagnifierActive && this.worldActivationTimer >= TOUCH_PRECISION_ACTIVATION_DELAY;
      return { x: this.worldCurX, y: this.worldCurY, active };
    }
    return null;
  }

  get magnifierActive(): boolean {
    return this.worldMagnifierActive;
  }

  private menuButtonRect(): { x: number; y: number; size: number } {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_MENU_BUTTON_SIZE_FRAC;
    const margin = unit * TOUCH_MENU_BUTTON_MARGIN_FRAC;
    return { x: window.innerWidth - margin - size, y: margin, size };
  }

  private fullscreenButtonRect(): { x: number; y: number; size: number } {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_FULLSCREEN_BUTTON_SIZE_FRAC;
    const gap = unit * TOUCH_FULLSCREEN_BUTTON_GAP_FRAC;
    const menuBtn = this.menuButtonRect();
    return { x: menuBtn.x - gap - size, y: menuBtn.y, size };
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

  // cruz (D-pad): ▲ e ▼ na coluna do meio, ◀ e ▶ nas pontas da linha do meio;
  // ancorada acima da hotbar e à margem esquerda da tela.
  private buttonRects(): ButtonRect[] {
    const size = window.innerHeight * TOUCH_DPAD_BUTTON_SIZE_FRAC;
    const gap = window.innerHeight * TOUCH_DPAD_GAP_FRAC;
    const margin = window.innerHeight * TOUCH_DPAD_MARGIN_FRAC;
    const step = size + gap;

    const left0 = margin;
    const bottom = hotbarTopY() - gap;
    const top0 = bottom - (size * 3 + gap * 2);

    return [
      { kind: "jump", x: left0 + step, y: top0, size },
      { kind: "left", x: left0, y: top0 + step, size },
      { kind: "right", x: left0 + step * 2, y: top0 + step, size },
      { kind: "crouch", x: left0 + step, y: top0 + step * 2, size },
    ];
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

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {
        // sem suporte ou negado: ignora, o jogo continua normalmente
      });
    } else {
      this.canvas.requestFullscreen?.().catch(() => {
        // sem suporte ou negado (precisa ser chamado direto no gesto de toque, o que já é o caso aqui)
      });
    }
  }

  private startWorldTouch(id: number, x: number, y: number): void {
    this.worldTouchId = id;
    this.worldCurX = x;
    this.worldCurY = y;
    this.worldHeldTime = 0;
    this.worldMagnifierActive = false;
    this.worldActivationTimer = 0;
  }

  private endWorldTouch(): void {
    // só dispara o tap se soltou antes da lupa abrir (senão a ação contínua já rodou durante o hold)
    if (!this.worldMagnifierActive && this.worldHeldTime < TOUCH_TAP_MAX_HOLD) {
      this.worldTapPending = true;
      this.worldTapX = this.worldCurX;
      this.worldTapY = this.worldCurY;
    }
    this.worldTouchId = null;
    this.worldMagnifierActive = false;
    this.worldActivationTimer = 0;
    this.worldHeldTime = 0;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const { x, y } = this.touchPos(t);

      const fsBtn = this.fullscreenButtonRect();
      if (x >= fsBtn.x && x <= fsBtn.x + fsBtn.size && y >= fsBtn.y && y <= fsBtn.y + fsBtn.size) {
        this.touchRoles.set(t.identifier, { kind: "menu" }); // reaproveita o papel inerte no touchend
        this.toggleFullscreen(); // precisa ser chamado direto no gesto de toque (síncrono)
        continue;
      }

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

      if (x >= window.innerWidth * TOUCH_RIGHT_ZONE_START_FRAC) {
        if (this.aimTouchId === null) {
          this.touchRoles.set(t.identifier, { kind: "aim" });
          this.aimTouchId = t.identifier;
          this.aimOriginX = x;
          this.aimOriginY = y;
          this.aimCurX = x;
          this.aimCurY = y;
          this.aimActive = true;
          this.updateAimVector();
        }
        // toque adicional na zona de mira enquanto ela já está ocupada: ignorado
      } else if (this.worldTouchId === null) {
        // zona esquerda/central fora do D-pad: modo de precisão (tap exato / lupa)
        this.touchRoles.set(t.identifier, { kind: "world" });
        this.startWorldTouch(t.identifier, x, y);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.aimTouchId) {
        const { x, y } = this.touchPos(t);
        this.aimCurX = x;
        this.aimCurY = y;
        this.updateAimVector();
        continue;
      }
      if (t.identifier === this.worldTouchId) {
        const { x, y } = this.touchPos(t);
        this.worldCurX = x;
        this.worldCurY = y;
      }
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
      } else if (role.kind === "world" && t.identifier === this.worldTouchId) {
        this.endWorldTouch();
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
    this.renderFullscreenButton(ctx);
    this.renderMagnifier(ctx);
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

  private renderFullscreenButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, size } = this.fullscreenButtonRect();
    ctx.fillStyle = TOUCH_BUTTON_BG_COLOR;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = TOUCH_BUTTON_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    ctx.fillStyle = TOUCH_BUTTON_ICON_COLOR;
    ctx.font = `${Math.round(size * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛶", x + size / 2, y + size / 2 + 1);
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

  // Lupa de precisão: amostra (via drawImage do próprio canvas, já desenhado
  // neste frame) um círculo da área sob o dedo e desenha essa amostra ampliada
  // num círculo deslocado acima do dedo, com crosshair marcando o tile alvo.
  private renderMagnifier(ctx: CanvasRenderingContext2D): void {
    if (!this.worldMagnifierActive) return;

    const unit = this.viewportUnit();
    const lensRadius = unit * TOUCH_MAGNIFIER_RADIUS_FRAC;
    const srcRadius = lensRadius / TOUCH_MAGNIFIER_ZOOM;
    const offsetY = unit * TOUCH_MAGNIFIER_OFFSET_Y_FRAC;
    const centerX = this.worldCurX;
    const centerY = this.worldCurY - offsetY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, lensRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = true; // prévia ampliada, não precisa ser pixel-perfect
    ctx.drawImage(
      ctx.canvas,
      this.worldCurX - srcRadius,
      this.worldCurY - srcRadius,
      srcRadius * 2,
      srcRadius * 2,
      centerX - lensRadius,
      centerY - lensRadius,
      lensRadius * 2,
      lensRadius * 2,
    );
    ctx.imageSmoothingEnabled = false;
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, lensRadius, 0, Math.PI * 2);
    ctx.strokeStyle = TOUCH_MAGNIFIER_BORDER_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();

    const crossSize = lensRadius * 0.25;
    ctx.strokeStyle = TOUCH_MAGNIFIER_CROSSHAIR_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
  }
}
