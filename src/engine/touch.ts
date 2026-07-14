import {
  TOUCH_AIM_JOYSTICK_MARGIN_FRAC,
  TOUCH_AIM_JOYSTICK_RADIUS_FRAC,
  TOUCH_BUTTON_BG_ACTIVE_COLOR,
  TOUCH_BUTTON_BG_COLOR,
  TOUCH_BUTTON_BORDER_COLOR,
  TOUCH_BUTTON_FONT_FRAC,
  TOUCH_BUTTON_ICON_COLOR,
  TOUCH_FULLSCREEN_BUTTON_GAP_FRAC,
  TOUCH_FULLSCREEN_BUTTON_SIZE_FRAC,
  TOUCH_JOYSTICK_BG_COLOR,
  TOUCH_JOYSTICK_BORDER_COLOR,
  TOUCH_JOYSTICK_DEADZONE_FRAC,
  TOUCH_JOYSTICK_HIT_RADIUS_MULT,
  TOUCH_JOYSTICK_KNOB_COLOR,
  TOUCH_JOYSTICK_KNOB_FRAC,
  TOUCH_JUMP_BUTTON_GAP_FRAC,
  TOUCH_JUMP_BUTTON_SIZE_FRAC,
  TOUCH_MAGNIFIER_BORDER_COLOR,
  TOUCH_MAGNIFIER_CROSSHAIR_COLOR,
  TOUCH_MAGNIFIER_OFFSET_Y_FRAC,
  TOUCH_MAGNIFIER_RADIUS_FRAC,
  TOUCH_MAGNIFIER_ZOOM,
  TOUCH_MENU_BUTTON_MARGIN_FRAC,
  TOUCH_MENU_BUTTON_SIZE_FRAC,
  TOUCH_MOVE_CROUCH_THRESHOLD_FRAC,
  TOUCH_MOVE_DOUBLE_FLICK_WINDOW,
  TOUCH_MOVE_FLICK_THRESHOLD_FRAC,
  TOUCH_MOVE_JOYSTICK_MARGIN_FRAC,
  TOUCH_MOVE_JOYSTICK_RADIUS_FRAC,
  TOUCH_MOVE_JUMP_PULSE,
  TOUCH_PRECISION_ACTIVATION_DELAY,
  TOUCH_TAP_MAX_HOLD,
} from "../config";
import { hotbarSlotIndexAt } from "../ui/hud";

interface Circle {
  x: number;
  y: number;
  radius: number;
}

interface Rect {
  x: number;
  y: number;
  size: number;
}

type TouchRole =
  | { kind: "jump" }
  | { kind: "hotbar" }
  | { kind: "move" }
  | { kind: "aim" }
  | { kind: "menu" }
  | { kind: "world" };

// Controles de toque estilo Terraria mobile, réplica do layout de duas mãos:
// - Joystick de movimento FIXO no canto inferior esquerdo: eixo horizontal anda,
//   segurar pra baixo agacha (nível, não toggle), duplo-flick pra cima = pulo.
// - Botão de pulo dedicado, grande, no lado direito (acima do joystick de mira) —
//   pulo acessível pelas duas mãos.
// - Joystick de mira FIXO no canto inferior direito (mineração/construção
//   contínuas na direção apontada).
// - Fora da área de qualquer controle: modo de precisão — tap rápido age no tile
//   exato tocado; tocar e segurar invoca a lupa de precisão.
// Despacho por toque: cada dedo só pertence ao controle em que TOCOU PRIMEIRO
// (até soltar); toques que começam fora de todo controle são sempre interação
// com o mundo, mesmo que estejam sobre a área visual de um joystick fixo se o
// toque não caiu dentro do seu círculo de captura. Multi-touch pleno: mover,
// pular e mirar/interagir funcionam ao mesmo tempo, cada dedo com seu papel.
// Só se ativa em dispositivos com tela de toque; em desktop a classe fica inerte.
export class TouchControls {
  readonly enabled: boolean;

  left = false;
  right = false;
  crouch = false;

  aimActive = false;
  aimDirX = 0;
  aimDirY = 0;

  get jump(): boolean {
    return this.jumpButtonHeld || this.jumpFlickTimer > 0;
  }

  private jumpButtonHeld = false;
  private jumpButtonTouchCount = 0;
  private jumpFlickTimer = 0; // >0 enquanto o pulso sintético do duplo-flick estiver "pressionado"

  private moveTouchId: number | null = null;
  private moveCurX = 0;
  private moveCurY = 0;
  private moveFlickWasUp = false; // estado (subiu além do limiar) do frame anterior, pra detectar borda
  private moveFlickPending = false; // já viu um flick pra cima, esperando o segundo dentro da janela
  private moveFlickTimer = 0; // segundos desde o primeiro flick, só válido se moveFlickPending

  private aimTouchId: number | null = null;
  private aimCurX = 0;
  private aimCurY = 0;

  private pendingHotbarSelect: number | null = null;
  private readonly touchRoles = new Map<number, TouchRole>();

  // botão discreto (canto superior direito) que abre/fecha o menu de save;
  // enquanto o menu está aberto, todo outro toque é tratado como clique nele
  // em vez de gameplay (movimento/hotbar/mira/precisão ficam inertes)
  private menuOpen = false;
  private menuButtonPending = false;
  private menuTapPos: { x: number; y: number } | null = null;

  // toque de precisão (tap exato / lupa) fora da área de qualquer controle
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

  // avança temporizadores por passo fixo do game loop: duplo-flick de pulo e o modo de precisão
  update(dt: number): void {
    if (this.moveFlickPending) {
      this.moveFlickTimer += dt;
      if (this.moveFlickTimer > TOUCH_MOVE_DOUBLE_FLICK_WINDOW) this.moveFlickPending = false;
    }
    if (this.jumpFlickTimer > 0) this.jumpFlickTimer = Math.max(0, this.jumpFlickTimer - dt);

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

  private viewportUnit(): number {
    return Math.min(window.innerWidth, window.innerHeight);
  }

  // origem fixa do joystick de movimento (canto inferior esquerdo)
  private moveJoystickCircle(): Circle {
    const unit = this.viewportUnit();
    const radius = unit * TOUCH_MOVE_JOYSTICK_RADIUS_FRAC;
    const margin = unit * TOUCH_MOVE_JOYSTICK_MARGIN_FRAC;
    return { x: margin + radius, y: window.innerHeight - margin - radius, radius };
  }

  // origem fixa do joystick de mira (canto inferior direito)
  private aimJoystickCircle(): Circle {
    const unit = this.viewportUnit();
    const radius = unit * TOUCH_AIM_JOYSTICK_RADIUS_FRAC;
    const margin = unit * TOUCH_AIM_JOYSTICK_MARGIN_FRAC;
    return { x: window.innerWidth - margin - radius, y: window.innerHeight - margin - radius, radius };
  }

  // botão de pulo dedicado: centralizado sobre o joystick de mira, acima dele
  private jumpButtonRect(): Rect {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_JUMP_BUTTON_SIZE_FRAC;
    const gap = unit * TOUCH_JUMP_BUTTON_GAP_FRAC;
    const aim = this.aimJoystickCircle();
    return { x: aim.x - size / 2, y: aim.y - aim.radius - gap - size, size };
  }

  private menuButtonRect(): Rect {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_MENU_BUTTON_SIZE_FRAC;
    const margin = unit * TOUCH_MENU_BUTTON_MARGIN_FRAC;
    return { x: window.innerWidth - margin - size, y: margin, size };
  }

  private fullscreenButtonRect(): Rect {
    const unit = this.viewportUnit();
    const size = unit * TOUCH_FULLSCREEN_BUTTON_SIZE_FRAC;
    const gap = unit * TOUCH_FULLSCREEN_BUTTON_GAP_FRAC;
    const menuBtn = this.menuButtonRect();
    return { x: menuBtn.x - gap - size, y: menuBtn.y, size };
  }

  private hitsRect(x: number, y: number, rect: Rect): boolean {
    return x >= rect.x && x <= rect.x + rect.size && y >= rect.y && y <= rect.y + rect.size;
  }

  private hitsCircle(x: number, y: number, circle: Circle, radiusMult = 1): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    const r = circle.radius * radiusMult;
    return dx * dx + dy * dy <= r * r;
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

  private endMoveTouch(): void {
    this.moveTouchId = null;
    this.left = false;
    this.right = false;
    this.crouch = false;
    // soltar o dedo cancela o gesto por completo: um flick pendente não "sobrevive" à troca de toque
    this.moveFlickWasUp = false;
    this.moveFlickPending = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const { x, y } = this.touchPos(t);

      const fsBtn = this.fullscreenButtonRect();
      if (this.hitsRect(x, y, fsBtn)) {
        this.touchRoles.set(t.identifier, { kind: "menu" }); // reaproveita o papel inerte no touchend
        this.toggleFullscreen(); // precisa ser chamado direto no gesto de toque (síncrono)
        continue;
      }

      const menuBtn = this.menuButtonRect();
      if (this.hitsRect(x, y, menuBtn)) {
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

      const jumpBtn = this.jumpButtonRect();
      if (this.hitsRect(x, y, jumpBtn)) {
        this.touchRoles.set(t.identifier, { kind: "jump" });
        this.jumpButtonTouchCount++;
        this.jumpButtonHeld = true;
        continue;
      }

      // toque começa DENTRO do círculo de captura de um joystick fixo -> pertence a ele até soltar;
      // fora disso (mesmo que "do lado direito da tela") é sempre interação com o mundo
      const moveCircle = this.moveJoystickCircle();
      if (this.moveTouchId === null && this.hitsCircle(x, y, moveCircle, TOUCH_JOYSTICK_HIT_RADIUS_MULT)) {
        this.touchRoles.set(t.identifier, { kind: "move" });
        this.moveTouchId = t.identifier;
        this.moveCurX = x;
        this.moveCurY = y;
        this.updateMoveVector();
        continue;
      }

      const aimCircle = this.aimJoystickCircle();
      if (this.aimTouchId === null && this.hitsCircle(x, y, aimCircle, TOUCH_JOYSTICK_HIT_RADIUS_MULT)) {
        this.touchRoles.set(t.identifier, { kind: "aim" });
        this.aimTouchId = t.identifier;
        this.aimCurX = x;
        this.aimCurY = y;
        this.aimActive = true;
        this.updateAimVector();
        continue;
      }

      if (this.worldTouchId === null) {
        this.touchRoles.set(t.identifier, { kind: "world" });
        this.startWorldTouch(t.identifier, x, y);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.moveTouchId) {
        const { x, y } = this.touchPos(t);
        this.moveCurX = x;
        this.moveCurY = y;
        this.updateMoveVector();
        continue;
      }
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

      if (role.kind === "jump") {
        this.jumpButtonTouchCount = Math.max(0, this.jumpButtonTouchCount - 1);
        if (this.jumpButtonTouchCount === 0) this.jumpButtonHeld = false;
      } else if (role.kind === "move" && t.identifier === this.moveTouchId) {
        this.endMoveTouch();
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

  // eixo horizontal -> esquerda/direita (digital); segurar pra baixo além do
  // limiar agacha (nível); cruzar o limiar de cima duas vezes dentro da janela
  // de duplo-flick dispara um pulso sintético de pulo.
  private updateMoveVector(): void {
    const circle = this.moveJoystickCircle();
    const dx = this.moveCurX - circle.x;
    const dy = this.moveCurY - circle.y;
    const deadzone = circle.radius * TOUCH_JOYSTICK_DEADZONE_FRAC;

    this.left = dx < -deadzone;
    this.right = dx > deadzone;
    this.crouch = dy > circle.radius * TOUCH_MOVE_CROUCH_THRESHOLD_FRAC;

    const isUp = dy < -circle.radius * TOUCH_MOVE_FLICK_THRESHOLD_FRAC;
    if (isUp && !this.moveFlickWasUp) {
      if (this.moveFlickPending) {
        this.moveFlickPending = false;
        this.jumpFlickTimer = TOUCH_MOVE_JUMP_PULSE;
      } else {
        this.moveFlickPending = true;
        this.moveFlickTimer = 0;
      }
    }
    this.moveFlickWasUp = isUp;
  }

  private updateAimVector(): void {
    const circle = this.aimJoystickCircle();
    const dx = this.aimCurX - circle.x;
    const dy = this.aimCurY - circle.y;
    const dist = Math.hypot(dx, dy);
    const deadzone = circle.radius * TOUCH_JOYSTICK_DEADZONE_FRAC;
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
    this.renderJoystick(ctx, this.moveJoystickCircle(), this.moveTouchId !== null, this.moveCurX, this.moveCurY);
    this.renderJoystick(ctx, this.aimJoystickCircle(), this.aimTouchId !== null, this.aimCurX, this.aimCurY);
    this.renderJumpButton(ctx);
    this.renderMenuButton(ctx);
    this.renderFullscreenButton(ctx);
    this.renderMagnifier(ctx);
  }

  // desenha a base (sempre visível, fixa) e o manípulo (no centro se solto, ou
  // seguindo o dedo clampado ao raio se em uso); usado pelos dois joysticks.
  private renderJoystick(ctx: CanvasRenderingContext2D, circle: Circle, active: boolean, curX: number, curY: number): void {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fillStyle = TOUCH_JOYSTICK_BG_COLOR;
    ctx.fill();
    ctx.strokeStyle = TOUCH_JOYSTICK_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    let knobX = circle.x;
    let knobY = circle.y;
    if (active) {
      const dx = curX - circle.x;
      const dy = curY - circle.y;
      const dist = Math.min(Math.hypot(dx, dy), circle.radius);
      const angle = Math.atan2(dy, dx);
      knobX = circle.x + Math.cos(angle) * dist;
      knobY = circle.y + Math.sin(angle) * dist;
    }
    ctx.beginPath();
    ctx.arc(knobX, knobY, circle.radius * TOUCH_JOYSTICK_KNOB_FRAC, 0, Math.PI * 2);
    ctx.fillStyle = TOUCH_JOYSTICK_KNOB_COLOR;
    ctx.fill();
  }

  private renderJumpButton(ctx: CanvasRenderingContext2D): void {
    const unit = this.viewportUnit();
    const rect = this.jumpButtonRect();
    ctx.fillStyle = this.jumpButtonHeld ? TOUCH_BUTTON_BG_ACTIVE_COLOR : TOUCH_BUTTON_BG_COLOR;
    ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
    ctx.strokeStyle = TOUCH_BUTTON_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.size - 2, rect.size - 2);

    ctx.fillStyle = TOUCH_BUTTON_ICON_COLOR;
    ctx.font = `${Math.round(unit * TOUCH_BUTTON_FONT_FRAC)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⬆", rect.x + rect.size / 2, rect.y + rect.size / 2 + 1);
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
