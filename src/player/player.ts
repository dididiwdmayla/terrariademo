import {
  PLAYER_ARM_HEIGHT,
  PLAYER_ARM_WIDTH,
  PLAYER_BLINK_DURATION,
  PLAYER_BLINK_MAX_INTERVAL,
  PLAYER_BLINK_MIN_INTERVAL,
  PLAYER_COLORS,
  PLAYER_CROUCH_FRAME_HELD,
  PLAYER_CROUCH_FRAME_TRANSITION,
  PLAYER_CROUCH_HEIGHT_MULT,
  PLAYER_CROUCH_SHEET_COLS,
  PLAYER_CROUCH_SHEET_SRC,
  PLAYER_CROUCH_TRANSITION_MS,
  PLAYER_EYE_H,
  PLAYER_EYE_W,
  PLAYER_EYE_X1,
  PLAYER_EYE_X2,
  PLAYER_EYE_Y,
  PLAYER_FALL_ARM_SPREAD,
  PLAYER_FALL_LEG_SPREAD,
  PLAYER_HAIR_HEIGHT,
  PLAYER_HEAD_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_IDLE_BREATH_AMPLITUDE,
  PLAYER_IDLE_BREATH_SPEED,
  PLAYER_IDLE_FRAME_ORDER,
  PLAYER_IDLE_SHEET_COLS,
  PLAYER_IDLE_SHEET_SRC,
  PLAYER_IDLE_STAGE1_FRAME,
  PLAYER_IDLE_WHISTLE_DELAY,
  PLAYER_IDLE_WHISTLE_FRAME_SPEED,
  PLAYER_JUMP_ANTICIPATION_DURATION,
  PLAYER_JUMP_ANTICIPATION_FRAME_MS,
  PLAYER_JUMP_ANTICIPATION_SQUASH,
  PLAYER_JUMP_ARM_RAISE,
  PLAYER_JUMP_FRAME_ANTICIPATION,
  PLAYER_JUMP_FRAME_FALLING,
  PLAYER_JUMP_FRAME_LANDING,
  PLAYER_JUMP_FRAME_RISING,
  PLAYER_JUMP_LEG_BEND,
  PLAYER_JUMP_SHEET_COLS,
  PLAYER_JUMP_SHEET_SRC,
  PLAYER_JUMP_STRETCH_AMOUNT,
  PLAYER_JUMP_STRETCH_DURATION,
  PLAYER_LAND_SQUASH_DURATION,
  PLAYER_LAND_SQUASH_MAX,
  PLAYER_LAND_SQUASH_WIDEN,
  PLAYER_LANDING_FRAME_MS,
  PLAYER_LEAN_MAX_DEG,
  PLAYER_LEAN_SMOOTH_SPEED,
  PLAYER_LEG_GAP,
  PLAYER_LEG_HEIGHT,
  PLAYER_LEG_WIDTH,
  PLAYER_MAX_HP,
  PLAYER_MINE_SWING_SPEED,
  PLAYER_MOUTH_H,
  PLAYER_MOUTH_W,
  PLAYER_MOUTH_Y,
  PLAYER_MOVE_SPEED,
  PLAYER_PICKAXE_ARC_DEG,
  PLAYER_PICKAXE_PIVOT_FRAC_X,
  PLAYER_PICKAXE_PIVOT_FRAC_Y,
  PLAYER_PICKAXE_REST_ANGLE_DEG,
  PLAYER_PICKAXE_SIZE,
  PLAYER_PICKAXE_SRC,
  PLAYER_PUPIL_COLOR,
  PLAYER_PUPIL_H,
  PLAYER_PUPIL_OFFSET,
  PLAYER_PUPIL_W,
  PLAYER_RUN_FRAME_ORDER,
  PLAYER_RUN_FRAME_SPEED,
  PLAYER_RUN_SHEET_COLS,
  PLAYER_RUN_SHEET_SRC,
  PLAYER_SECONDARY_LAG_FACTOR,
  PLAYER_SECONDARY_MAX_OFFSET,
  PLAYER_HAIR_SPRING_DAMPING,
  PLAYER_HAIR_SPRING_STIFFNESS,
  PLAYER_ARM_SPRING_DAMPING,
  PLAYER_ARM_SPRING_STIFFNESS,
  PLAYER_SHEET_FRAME_H,
  PLAYER_SHEET_FRAME_W,
  PLAYER_SPRITE_HEIGHT_TILES,
  PLAYER_SPRITE_SHOULDER_X,
  PLAYER_SPRITE_SHOULDER_Y,
  PLAYER_TORSO_HEIGHT,
  PLAYER_TORSO_WIDTH,
  PLAYER_WALK_ARM_SWING,
  PLAYER_WALK_CYCLE_SPEED,
  PLAYER_WALK_FRAME_ORDER,
  PLAYER_WALK_FRAME_SPEED,
  PLAYER_WALK_LEG_SWING,
  PLAYER_WALK_SHEET_COLS,
  PLAYER_WALK_SHEET_SRC,
  PLAYER_WIDTH,
  MAX_FALL_SPEED,
  TILE_SIZE,
} from "../config";
import { shade } from "../world/tiles";
import type { Camera } from "../engine/camera";

type AnimState = "idle" | "walking" | "running" | "jumping" | "falling" | "crouching";

interface SpriteSheet {
  img: HTMLImageElement;
  ready: boolean;
}

// Carregado uma única vez por sheet (nível de módulo), compartilhado por qualquer Player.
function loadSheet(src: string): SpriteSheet {
  const sheet: SpriteSheet = { img: new Image(), ready: false };
  sheet.img.onload = () => {
    sheet.ready = true;
  };
  // falha silenciosa: ready permanece false e o render cai no fallback procedural
  sheet.img.src = src;
  return sheet;
}

const walkSheet = loadSheet(PLAYER_WALK_SHEET_SRC);
const runSheet = loadSheet(PLAYER_RUN_SHEET_SRC);
const jumpSheet = loadSheet(PLAYER_JUMP_SHEET_SRC);
const idleSheet = loadSheet(PLAYER_IDLE_SHEET_SRC);
const crouchSheet = loadSheet(PLAYER_CROUCH_SHEET_SRC);
const pickaxeSheet = loadSheet(PLAYER_PICKAXE_SRC);

function allSpritesReady(): boolean {
  return walkSheet.ready && runSheet.ready && jumpSheet.ready && idleSheet.ready && crouchSheet.ready;
}

const BRIGHTNESS_STEPS = 31; // quantização do brilho p/ cache de cores sombreadas

// facilita elástico ao voltar do squash de aterrissagem (overshoot amortecido)
function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

interface Spring {
  pos: number;
  vel: number;
}

function stepSpring(spring: Spring, target: number, dt: number, stiffness: number, damping: number): void {
  const accel = (target - spring.pos) * stiffness - spring.vel * damping;
  spring.vel += accel * dt;
  spring.pos += spring.vel * dt;
}

// Estado do jogador + desenho procedural articulado (cabeça, tronco, braços, pernas).
export class Player {
  x = 0; // canto superior esquerdo, em px de mundo
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = false;
  coyoteTimer = 0;
  jumpHeld = false;
  hp = PLAYER_MAX_HP;
  readonly maxHp = PLAYER_MAX_HP;
  readonly width = PLAYER_WIDTH;
  readonly height = PLAYER_HEIGHT;

  crouching = false;
  private mining = false;
  private mineAngle = 0;

  private state: AnimState = "idle";
  private animTime = 0;
  private walkPhase = 0; // usado pelo fallback procedural (balanço senoidal)
  private walkFrameTimer = 0; // avança pelos frames do walk_sheet
  private runFrameTimer = 0; // avança pelos frames do run_sheet
  private blinking = false;
  private blinkTimer = PLAYER_BLINK_MIN_INTERVAL;

  // idle em dois estágios: parado (frame 0) e, após PLAYER_IDLE_WHISTLE_DELAY sem input, ciclo de assovio
  private idleNoInputTimer = 0;
  private idleFrameTimer = 0;
  private idleWhistling = false;

  // agachar: frame de transição breve antes de manter o frame agachado
  private wasCrouching = false;
  private crouchTransitionTimer = 0;

  // reação procedural: squash & stretch, inclinação, movimento secundário (não afeta física/hitbox)
  private prevGrounded = false;
  private lastAirVy = 0;
  private landSquashTimer = 0;
  private landSquashIntensity = 0;
  private jumpAnticipationTimer = 0;
  private jumpStretchTimer = 0;
  // timers dos frames de pulo/aterrissagem do sprite (independentes do squash procedural acima)
  private jumpAnticipationFrameTimer = 0;
  private landingFrameTimer = 0;
  private scaleX = 1;
  private scaleY = 1;
  private leanAngle = 0; // rad, suavizado
  private readonly hairSpring: Spring = { pos: 0, vel: 0 };
  private readonly armSpring: Spring = { pos: 0, vel: 0 };

  // Avança animação e estados visuais (agachar, sprint, mineração). Não toca em física/hitbox.
  update(dt: number, crouchHeld: boolean, sprintHeld: boolean, mining: boolean, mineAngle: number): void {
    this.crouching = crouchHeld && this.grounded;
    this.mining = mining;
    this.mineAngle = mineAngle;
    const sprinting = sprintHeld && this.grounded && !this.crouching;

    if (!this.grounded) {
      this.state = this.vy < 0 ? "jumping" : "falling";
    } else if (this.crouching) {
      this.state = "crouching";
    } else if (Math.abs(this.vx) > 5) {
      this.state = sprinting ? "running" : "walking";
    } else {
      this.state = "idle";
    }

    this.animTime += dt;
    if (this.state === "walking") {
      const speedFrac = Math.abs(this.vx) / PLAYER_MOVE_SPEED;
      this.walkPhase += dt * PLAYER_WALK_CYCLE_SPEED * speedFrac;
      this.walkFrameTimer += dt * PLAYER_WALK_FRAME_SPEED * speedFrac;
    } else if (this.state === "running") {
      this.walkPhase += dt * PLAYER_WALK_CYCLE_SPEED * 1.5;
      this.runFrameTimer += dt * PLAYER_RUN_FRAME_SPEED;
    }

    // idle em dois estágios: qualquer input (movimento/pulo/agachar/minerar) volta ao estágio 1
    if (this.state === "idle" && !this.mining) {
      this.idleNoInputTimer += dt;
    } else {
      this.idleNoInputTimer = 0;
      this.idleFrameTimer = 0;
    }
    this.idleWhistling = this.idleNoInputTimer >= PLAYER_IDLE_WHISTLE_DELAY;
    if (this.idleWhistling) this.idleFrameTimer += dt * PLAYER_IDLE_WHISTLE_FRAME_SPEED;

    // agachar: frame de transição breve ao entrar no estado, depois mantém o frame agachado
    if (this.state === "crouching") {
      if (!this.wasCrouching) this.crouchTransitionTimer = PLAYER_CROUCH_TRANSITION_MS / 1000;
      else this.crouchTransitionTimer = Math.max(0, this.crouchTransitionTimer - dt);
    } else {
      this.crouchTransitionTimer = 0;
    }
    this.wasCrouching = this.state === "crouching";

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (this.blinking) {
        this.blinking = false;
        this.blinkTimer = PLAYER_BLINK_MIN_INTERVAL + Math.random() * (PLAYER_BLINK_MAX_INTERVAL - PLAYER_BLINK_MIN_INTERVAL);
      } else {
        this.blinking = true;
        this.blinkTimer = PLAYER_BLINK_DURATION;
      }
    }

    this.updateReactions(dt);
  }

  // Detecta pouso/decolagem via transição de `grounded` e conduz squash/stretch, inclinação e springs.
  private updateReactions(dt: number): void {
    const justLanded = !this.prevGrounded && this.grounded;
    const justJumped = this.prevGrounded && !this.grounded && this.vy < 0;

    if (justLanded) {
      this.landSquashTimer = PLAYER_LAND_SQUASH_DURATION;
      this.landSquashIntensity = Math.min(1, this.lastAirVy / MAX_FALL_SPEED);
      this.landingFrameTimer = PLAYER_LANDING_FRAME_MS / 1000;
    }
    if (justJumped) {
      this.jumpAnticipationTimer = PLAYER_JUMP_ANTICIPATION_DURATION;
      this.jumpStretchTimer = PLAYER_JUMP_STRETCH_DURATION;
      this.jumpAnticipationFrameTimer = PLAYER_JUMP_ANTICIPATION_FRAME_MS / 1000;
    }
    if (!this.grounded) this.lastAirVy = this.vy;
    this.prevGrounded = this.grounded;
    this.landingFrameTimer = Math.max(0, this.landingFrameTimer - dt);
    this.jumpAnticipationFrameTimer = Math.max(0, this.jumpAnticipationFrameTimer - dt);

    let scaleY = 1;
    let scaleX = 1;

    if (this.landSquashTimer > 0) {
      this.landSquashTimer = Math.max(0, this.landSquashTimer - dt);
      const progress = 1 - this.landSquashTimer / PLAYER_LAND_SQUASH_DURATION;
      const decay = 1 - easeOutElastic(progress);
      const amt = this.landSquashIntensity * PLAYER_LAND_SQUASH_MAX * decay;
      scaleY *= 1 - amt;
      scaleX *= 1 + amt * PLAYER_LAND_SQUASH_WIDEN;
    }

    if (this.jumpAnticipationTimer > 0) {
      this.jumpAnticipationTimer = Math.max(0, this.jumpAnticipationTimer - dt);
      const progress = this.jumpAnticipationTimer / PLAYER_JUMP_ANTICIPATION_DURATION;
      scaleY *= 1 - PLAYER_JUMP_ANTICIPATION_SQUASH * progress;
      scaleX *= 1 + PLAYER_JUMP_ANTICIPATION_SQUASH * 0.5 * progress;
    } else if (this.jumpStretchTimer > 0) {
      this.jumpStretchTimer = Math.max(0, this.jumpStretchTimer - dt);
      const progress = this.jumpStretchTimer / PLAYER_JUMP_STRETCH_DURATION;
      scaleY *= 1 + PLAYER_JUMP_STRETCH_AMOUNT * progress;
      scaleX *= 1 - PLAYER_JUMP_STRETCH_AMOUNT * 0.5 * progress;
    }

    this.scaleY = scaleY;
    this.scaleX = scaleX;

    // inclinação na direção do movimento, com retorno suave ao parar
    const targetLeanDeg = Math.max(-1, Math.min(1, this.vx / PLAYER_MOVE_SPEED)) * PLAYER_LEAN_MAX_DEG;
    const targetLean = (targetLeanDeg * Math.PI) / 180;
    const leanSmooth = 1 - Math.exp(-PLAYER_LEAN_SMOOTH_SPEED * dt);
    this.leanAngle += (targetLean - this.leanAngle) * leanSmooth;

    // movimento secundário (cabelo, barra dos braços): spring com atraso/inércia atrás da velocidade horizontal
    const secondaryTarget = Math.max(
      -PLAYER_SECONDARY_MAX_OFFSET,
      Math.min(PLAYER_SECONDARY_MAX_OFFSET, -this.vx * PLAYER_SECONDARY_LAG_FACTOR),
    );
    stepSpring(this.hairSpring, secondaryTarget, dt, PLAYER_HAIR_SPRING_STIFFNESS, PLAYER_HAIR_SPRING_DAMPING);
    stepSpring(this.armSpring, secondaryTarget, dt, PLAYER_ARM_SPRING_STIFFNESS, PLAYER_ARM_SPRING_DAMPING);
  }

  // brilho local [0,1] vindo da iluminação; sombreia todas as cores do sprite
  private brightness = 1;
  private readonly shadeCache = new Map<string, string>();

  private shaded(color: string): string {
    const q = Math.round(this.brightness * BRIGHTNESS_STEPS);
    if (q >= BRIGHTNESS_STEPS) return color;
    const key = `${color}|${q}`;
    let s = this.shadeCache.get(key);
    if (!s) {
      s = shade(color, q / BRIGHTNESS_STEPS);
      this.shadeCache.set(key, s);
    }
    return s;
  }

  // Escolhe o sheet e o índice do frame atual pro estado/fase de animação.
  private currentFrameSource(): { sheet: SpriteSheet; cols: number; frameIndex: number } {
    if (this.state === "crouching") {
      const frameIndex = this.crouchTransitionTimer > 0 ? PLAYER_CROUCH_FRAME_TRANSITION : PLAYER_CROUCH_FRAME_HELD;
      return { sheet: crouchSheet, cols: PLAYER_CROUCH_SHEET_COLS, frameIndex };
    }
    if (this.landingFrameTimer > 0) {
      return { sheet: jumpSheet, cols: PLAYER_JUMP_SHEET_COLS, frameIndex: PLAYER_JUMP_FRAME_LANDING };
    }
    if (this.state === "jumping" || this.state === "falling") {
      const frameIndex =
        this.jumpAnticipationFrameTimer > 0
          ? PLAYER_JUMP_FRAME_ANTICIPATION
          : this.vy < 0
            ? PLAYER_JUMP_FRAME_RISING
            : PLAYER_JUMP_FRAME_FALLING;
      return { sheet: jumpSheet, cols: PLAYER_JUMP_SHEET_COLS, frameIndex };
    }
    if (this.state === "running") {
      const frameIndex = PLAYER_RUN_FRAME_ORDER[Math.floor(this.runFrameTimer) % PLAYER_RUN_FRAME_ORDER.length];
      return { sheet: runSheet, cols: PLAYER_RUN_SHEET_COLS, frameIndex };
    }
    if (this.state === "walking") {
      const frameIndex = PLAYER_WALK_FRAME_ORDER[Math.floor(this.walkFrameTimer) % PLAYER_WALK_FRAME_ORDER.length];
      return { sheet: walkSheet, cols: PLAYER_WALK_SHEET_COLS, frameIndex };
    }
    // idle
    const frameIndex = this.idleWhistling
      ? PLAYER_IDLE_FRAME_ORDER[Math.floor(this.idleFrameTimer) % PLAYER_IDLE_FRAME_ORDER.length]
      : PLAYER_IDLE_STAGE1_FRAME;
    return { sheet: idleSheet, cols: PLAYER_IDLE_SHEET_COLS, frameIndex };
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, brightness = 1): void {
    this.brightness = brightness;
    if (allSpritesReady()) {
      this.renderSprite(ctx, camera);
      return;
    }
    // enquanto as imagens carregam (ou se alguma falhar), usa o desenho procedural antigo
    this.renderProcedural(ctx, camera);
  }

  // Recorta a célula do frame atual do sheet correspondente ao estado e desenha
  // ancorado pelo pé na base da hitbox, com squash/stretch e inclinação aplicados
  // via transform (mesma lógica de ancoragem do fallback procedural) e espelhamento
  // horizontal quando o player olha pra esquerda (os frames foram desenhados pra direita).
  // A picareta é desenhada separadamente, girando em torno do ombro da frente.
  private renderSprite(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const z = camera.zoom;
    const s = camera.worldToScreen(this.x, this.y);
    const px = Math.round(s.x);
    const py = Math.round(s.y);

    const { sheet, cols, frameIndex } = this.currentFrameSource();
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    const sx = col * PLAYER_SHEET_FRAME_W;
    const sy = row * PLAYER_SHEET_FRAME_H;

    const vScale = (this.state === "crouching" ? PLAYER_CROUCH_HEIGHT_MULT : 1) * this.scaleY;
    const hScale = this.scaleX;

    const drawH = PLAYER_SPRITE_HEIGHT_TILES * TILE_SIZE * z;
    const drawW = drawH * (PLAYER_SHEET_FRAME_W / PLAYER_SHEET_FRAME_H);
    const footX = px + (this.width / 2) * z;
    const footY = py + this.height * z;

    // pivô do ombro/picareta: mesma escala do sprite, espelhado com o facing
    const shoulderScale = drawH / PLAYER_SHEET_FRAME_H;
    const frameShoulderX = PLAYER_SPRITE_SHOULDER_X * shoulderScale;
    const frameShoulderY = PLAYER_SPRITE_SHOULDER_Y * shoulderScale;
    const shoulderX = this.facing === 1 ? footX - drawW / 2 + frameShoulderX : footX + drawW / 2 - frameShoulderX;
    const shoulderY = footY - drawH + frameShoulderY;
    const swingPhase = this.mining ? (this.animTime * PLAYER_MINE_SWING_SPEED) % 1 : 0;
    const pickaxeBehind = this.mining && swingPhase < 0.5;

    if (pickaxeBehind) this.drawPickaxe(ctx, shoulderX, shoulderY, shoulderScale, swingPhase);

    ctx.save();
    ctx.translate(footX, footY);
    ctx.rotate(this.leanAngle);
    ctx.scale((this.facing === 1 ? 1 : -1) * hScale, vScale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet.img, sx, sy, PLAYER_SHEET_FRAME_W, PLAYER_SHEET_FRAME_H, -drawW / 2, -drawH, drawW, drawH);
    ctx.restore();

    if (this.mining && !pickaxeBehind) this.drawPickaxe(ctx, shoulderX, shoulderY, shoulderScale, swingPhase);
  }

  // Desenha a picareta rotacionada em torno do ombro, apontando pro ângulo de mira
  // com um golpe (arco de PLAYER_PICKAXE_ARC_DEG) por ciclo de mineração.
  private drawPickaxe(ctx: CanvasRenderingContext2D, shoulderX: number, shoulderY: number, scale: number, swingPhase: number): void {
    if (!pickaxeSheet.ready) return;
    const arcRad = (PLAYER_PICKAXE_ARC_DEG * Math.PI) / 180;
    const restAngleRad = (PLAYER_PICKAXE_REST_ANGLE_DEG * Math.PI) / 180;
    const swingOffset = (swingPhase - 0.5) * arcRad;
    const rotation = this.mineAngle + swingOffset - restAngleRad;
    const size = PLAYER_PICKAXE_SIZE * scale;
    const pivotX = PLAYER_PICKAXE_PIVOT_FRAC_X * size;
    const pivotY = PLAYER_PICKAXE_PIVOT_FRAC_Y * size;

    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(rotation);
    ctx.drawImage(pickaxeSheet.img, -pivotX, -pivotY, size, size);
    ctx.restore();
  }

  private renderProcedural(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const z = camera.zoom;
    const s = camera.worldToScreen(this.x, this.y);
    const px = Math.round(s.x);
    const py = Math.round(s.y);

    // agachar encolhe o desenho verticalmente ~30%, ancorado nos pés (hitbox intacta);
    // combinado com squash/stretch de pouso/pulo (também ancorado nos pés)
    const vScale = (this.state === "crouching" ? PLAYER_CROUCH_HEIGHT_MULT : 1) * this.scaleY;
    const hScale = this.scaleX;
    const centerX = this.width / 2;
    const top = py + this.height * (1 - vScale) * z;
    const mapY = (localY: number) => top + localY * vScale * z;
    const mapH = (localH: number) => localH * vScale * z;
    const mapX = (localX: number) => px + (centerX + (localX - centerX) * hScale) * z;

    // inclinação na direção do movimento, rotacionada em torno dos pés
    ctx.save();
    const pivotX = px + centerX * z;
    const pivotY = py + this.height * z;
    ctx.translate(pivotX, pivotY);
    ctx.rotate(this.leanAngle);
    ctx.translate(-pivotX, -pivotY);

    const breathing = this.state === "idle" || this.state === "crouching";
    const breathOffset = breathing
      ? Math.sin(this.animTime * Math.PI * 2 * PLAYER_IDLE_BREATH_SPEED) * PLAYER_IDLE_BREATH_AMPLITUDE
      : 0;

    // deslocamentos horizontais de perna/braço (local, sem escala) por estado
    let legDx1 = 0; // perna esquerda
    let legDx2 = 0; // perna direita
    let armDx1 = 0; // braço esquerdo
    let armDx2 = 0; // braço direito
    let legHeightAdj = 0; // reduz altura das pernas (pulo)
    let armYOffset = 0; // eleva braços (pulo)

    if (this.state === "walking" || this.state === "running") {
      const swingLeg = Math.sin(this.walkPhase) * PLAYER_WALK_LEG_SWING;
      const swingArm = Math.sin(this.walkPhase) * PLAYER_WALK_ARM_SWING;
      legDx1 = swingLeg;
      legDx2 = -swingLeg;
      armDx1 = -swingArm;
      armDx2 = swingArm;
    } else if (this.state === "jumping") {
      legHeightAdj = PLAYER_JUMP_LEG_BEND;
      armYOffset = -PLAYER_JUMP_ARM_RAISE;
    } else if (this.state === "falling") {
      armDx1 = -PLAYER_FALL_ARM_SPREAD;
      armDx2 = PLAYER_FALL_ARM_SPREAD;
      legDx1 = -PLAYER_FALL_LEG_SPREAD;
      legDx2 = PLAYER_FALL_LEG_SPREAD;
    }

    // movimento secundário: barra dos braços reage com atraso/inércia às mudanças de velocidade
    armDx1 += this.armSpring.pos;
    armDx2 += this.armSpring.pos;

    const isFrontRight = this.facing === 1;

    this.drawLegs(ctx, mapX, mapY, mapH, z, legDx1, legDx2, legHeightAdj);
    this.drawTorso(ctx, mapX, mapY, mapH, z, breathOffset);
    this.drawBackArm(ctx, mapX, mapY, mapH, z, isFrontRight, armDx1, armDx2, armYOffset);
    this.drawHead(ctx, mapX, mapY, mapH, z, breathOffset);
    this.drawFrontArm(ctx, px, top, vScale, z, isFrontRight, armDx1, armDx2, armYOffset);
    ctx.restore();
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    mapX: (v: number) => number,
    mapY: (v: number) => number,
    mapH: (v: number) => number,
    z: number,
    breathOffset: number,
  ): void {
    const headW = this.width;
    const headX = 0;
    const headY = breathOffset;

    ctx.fillStyle = this.shaded(PLAYER_COLORS.cabeca);
    ctx.fillRect(mapX(headX), mapY(headY), headW * z, mapH(PLAYER_HEAD_HEIGHT));

    // cabelo: movimento secundário com atraso/inércia atrás da velocidade horizontal
    const hairDx = this.hairSpring.pos;
    ctx.fillStyle = this.shaded(PLAYER_COLORS.cabelo);
    ctx.fillRect(mapX(headX + hairDx), mapY(headY), headW * z, mapH(PLAYER_HAIR_HEIGHT));

    // olhos virados pra direção do movimento (fecham ao piscar)
    const eye1 = this.facing === 1 ? PLAYER_EYE_X1 : this.width - PLAYER_EYE_X1 - PLAYER_EYE_W;
    const eye2 = this.facing === 1 ? PLAYER_EYE_X2 : this.width - PLAYER_EYE_X2 - PLAYER_EYE_W;
    ctx.fillStyle = this.shaded(PLAYER_COLORS.olho);
    const eyeH = this.blinking ? Math.max(1, PLAYER_EYE_H * 0.3) : PLAYER_EYE_H;
    const eyeY = headY + PLAYER_EYE_Y + (PLAYER_EYE_H - eyeH);
    ctx.fillRect(mapX(eye1), mapY(eyeY), PLAYER_EYE_W * z, mapH(eyeH));
    ctx.fillRect(mapX(eye2), mapY(eyeY), PLAYER_EYE_W * z, mapH(eyeH));

    // pupilas: deslocam sutilmente em direção ao cursor, clampadas às bordas do olho; somem ao piscar
    if (!this.blinking) {
      const maxDx = (PLAYER_EYE_W - PLAYER_PUPIL_W) / 2;
      const maxDy = (PLAYER_EYE_H - PLAYER_PUPIL_H) / 2;
      const dx = Math.max(-maxDx, Math.min(maxDx, Math.cos(this.mineAngle) * PLAYER_PUPIL_OFFSET));
      const dy = Math.max(-maxDy, Math.min(maxDy, Math.sin(this.mineAngle) * PLAYER_PUPIL_OFFSET));
      const pupilCenterY = eyeY + PLAYER_EYE_H / 2 + dy - PLAYER_PUPIL_H / 2;
      ctx.fillStyle = this.shaded(PLAYER_PUPIL_COLOR);
      ctx.fillRect(mapX(eye1 + PLAYER_EYE_W / 2 - PLAYER_PUPIL_W / 2 + dx), mapY(pupilCenterY), PLAYER_PUPIL_W * z, mapH(PLAYER_PUPIL_H));
      ctx.fillRect(mapX(eye2 + PLAYER_EYE_W / 2 - PLAYER_PUPIL_W / 2 + dx), mapY(pupilCenterY), PLAYER_PUPIL_W * z, mapH(PLAYER_PUPIL_H));
    }

    // boca simples
    const mouthX = this.width / 2 - PLAYER_MOUTH_W / 2;
    ctx.fillStyle = this.shaded(PLAYER_COLORS.boca);
    ctx.fillRect(mapX(mouthX), mapY(headY + PLAYER_MOUTH_Y), PLAYER_MOUTH_W * z, mapH(PLAYER_MOUTH_H));
  }

  private drawTorso(
    ctx: CanvasRenderingContext2D,
    mapX: (v: number) => number,
    mapY: (v: number) => number,
    mapH: (v: number) => number,
    z: number,
    breathOffset: number,
  ): void {
    const torsoX = (this.width - PLAYER_TORSO_WIDTH) / 2;
    ctx.fillStyle = this.shaded(PLAYER_COLORS.corpo);
    ctx.fillRect(mapX(torsoX), mapY(PLAYER_HEAD_HEIGHT + breathOffset), PLAYER_TORSO_WIDTH * z, mapH(PLAYER_TORSO_HEIGHT));
  }

  private drawLegs(
    ctx: CanvasRenderingContext2D,
    mapX: (v: number) => number,
    mapY: (v: number) => number,
    mapH: (v: number) => number,
    z: number,
    dx1: number,
    dx2: number,
    heightAdj: number,
  ): void {
    const legY = PLAYER_HEAD_HEIGHT + PLAYER_TORSO_HEIGHT;
    const legH = PLAYER_LEG_HEIGHT - heightAdj;
    const leg1X = 0;
    const leg2X = PLAYER_LEG_WIDTH + PLAYER_LEG_GAP;

    ctx.fillStyle = this.shaded(PLAYER_COLORS.perna);
    ctx.fillRect(mapX(leg1X + dx1), mapY(legY), PLAYER_LEG_WIDTH * z, mapH(legH));
    ctx.fillRect(mapX(leg2X + dx2), mapY(legY), PLAYER_LEG_WIDTH * z, mapH(legH));
  }

  private armGeometry(isFrontRight: boolean, side: "back" | "front") {
    const isRightArm = side === "front" ? isFrontRight : !isFrontRight;
    const armX = isRightArm ? this.width - PLAYER_ARM_WIDTH : 0;
    return { armX, isRightArm };
  }

  private drawBackArm(
    ctx: CanvasRenderingContext2D,
    mapX: (v: number) => number,
    mapY: (v: number) => number,
    mapH: (v: number) => number,
    z: number,
    isFrontRight: boolean,
    armDx1: number,
    armDx2: number,
    armYOffset: number,
  ): void {
    const { armX, isRightArm } = this.armGeometry(isFrontRight, "back");
    const dx = isRightArm ? armDx2 : armDx1;
    ctx.fillStyle = this.shaded(PLAYER_COLORS.braco);
    ctx.fillRect(mapX(armX + dx), mapY(PLAYER_HEAD_HEIGHT + armYOffset), PLAYER_ARM_WIDTH * z, mapH(PLAYER_ARM_HEIGHT));
  }

  // Braço da frente (estático); a picareta é desenhada por cima, girando em torno do ombro, ao minerar.
  private drawFrontArm(
    ctx: CanvasRenderingContext2D,
    px: number,
    top: number,
    vScale: number,
    z: number,
    isFrontRight: boolean,
    armDx1: number,
    armDx2: number,
    armYOffset: number,
  ): void {
    const { armX, isRightArm } = this.armGeometry(isFrontRight, "front");
    const dx = isRightArm ? armDx2 : armDx1;
    const shoulderLocalX = armX + PLAYER_ARM_WIDTH / 2 + dx;
    const shoulderLocalY = PLAYER_HEAD_HEIGHT + armYOffset;
    const shoulderX = px + shoulderLocalX * z;
    const shoulderY = top + shoulderLocalY * vScale * z;
    const armLen = PLAYER_ARM_HEIGHT * z;
    const armW = PLAYER_ARM_WIDTH * z;

    ctx.fillStyle = this.shaded(PLAYER_COLORS.braco);
    ctx.fillRect(shoulderX - armW / 2, shoulderY, armW, armLen);

    if (this.mining) {
      const shoulderScale = (PLAYER_SPRITE_HEIGHT_TILES * TILE_SIZE * z) / PLAYER_SHEET_FRAME_H;
      const swingPhase = (this.animTime * PLAYER_MINE_SWING_SPEED) % 1;
      this.drawPickaxe(ctx, shoulderX, shoulderY, shoulderScale, swingPhase);
    }
  }
}
