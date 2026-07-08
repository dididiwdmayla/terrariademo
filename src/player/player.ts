import {
  PLAYER_ARM_HEIGHT,
  PLAYER_ARM_WIDTH,
  PLAYER_BLINK_DURATION,
  PLAYER_BLINK_MAX_INTERVAL,
  PLAYER_BLINK_MIN_INTERVAL,
  PLAYER_COLORS,
  PLAYER_CROUCH_HEIGHT_MULT,
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
  PLAYER_JUMP_ARM_RAISE,
  PLAYER_JUMP_LEG_BEND,
  PLAYER_LEG_GAP,
  PLAYER_LEG_HEIGHT,
  PLAYER_LEG_WIDTH,
  PLAYER_MAX_HP,
  PLAYER_MINE_SWING_AMPLITUDE,
  PLAYER_MINE_SWING_SPEED,
  PLAYER_MOUTH_H,
  PLAYER_MOUTH_W,
  PLAYER_MOUTH_Y,
  PLAYER_MOVE_SPEED,
  PLAYER_PUPIL_COLOR,
  PLAYER_PUPIL_H,
  PLAYER_PUPIL_OFFSET,
  PLAYER_PUPIL_W,
  PLAYER_TORSO_HEIGHT,
  PLAYER_TORSO_WIDTH,
  PLAYER_WALK_ARM_SWING,
  PLAYER_WALK_CYCLE_SPEED,
  PLAYER_WALK_LEG_SWING,
  PLAYER_WIDTH,
} from "../config";
import type { Camera } from "../engine/camera";

type AnimState = "idle" | "walking" | "jumping" | "falling" | "crouching";

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
  private walkPhase = 0;
  private blinking = false;
  private blinkTimer = PLAYER_BLINK_MIN_INTERVAL;

  // Avança animação e estados visuais (agachar, mineração). Não toca em física/hitbox.
  update(dt: number, crouchHeld: boolean, mining: boolean, mineAngle: number): void {
    this.crouching = crouchHeld && this.grounded;
    this.mining = mining;
    this.mineAngle = mineAngle;

    if (!this.grounded) {
      this.state = this.vy < 0 ? "jumping" : "falling";
    } else if (this.crouching) {
      this.state = "crouching";
    } else if (Math.abs(this.vx) > 5) {
      this.state = "walking";
    } else {
      this.state = "idle";
    }

    this.animTime += dt;
    if (this.state === "walking") {
      this.walkPhase += dt * PLAYER_WALK_CYCLE_SPEED * (Math.abs(this.vx) / PLAYER_MOVE_SPEED);
    }

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
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const z = camera.zoom;
    const s = camera.worldToScreen(this.x, this.y);
    const px = Math.round(s.x);
    const py = Math.round(s.y);

    // agachar encolhe o desenho verticalmente ~30%, ancorado nos pés (hitbox intacta)
    const vScale = this.state === "crouching" ? PLAYER_CROUCH_HEIGHT_MULT : 1;
    const top = py + this.height * (1 - vScale) * z;
    const mapY = (localY: number) => top + localY * vScale * z;
    const mapH = (localH: number) => localH * vScale * z;
    const mapX = (localX: number) => px + localX * z;

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

    if (this.state === "walking") {
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

    const isFrontRight = this.facing === 1;

    this.drawLegs(ctx, mapX, mapY, mapH, z, legDx1, legDx2, legHeightAdj);
    this.drawTorso(ctx, mapX, mapY, mapH, z, breathOffset);
    this.drawBackArm(ctx, mapX, mapY, mapH, z, isFrontRight, armDx1, armDx2, armYOffset);
    this.drawHead(ctx, mapX, mapY, mapH, z, breathOffset);
    this.drawFrontArm(ctx, px, top, vScale, z, isFrontRight, armDx1, armDx2, armYOffset);
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

    ctx.fillStyle = PLAYER_COLORS.cabeca;
    ctx.fillRect(mapX(headX), mapY(headY), headW * z, mapH(PLAYER_HEAD_HEIGHT));

    // cabelo
    ctx.fillStyle = PLAYER_COLORS.cabelo;
    ctx.fillRect(mapX(headX), mapY(headY), headW * z, mapH(PLAYER_HAIR_HEIGHT));

    // olhos virados pra direção do movimento (fecham ao piscar)
    const eye1 = this.facing === 1 ? PLAYER_EYE_X1 : this.width - PLAYER_EYE_X1 - PLAYER_EYE_W;
    const eye2 = this.facing === 1 ? PLAYER_EYE_X2 : this.width - PLAYER_EYE_X2 - PLAYER_EYE_W;
    ctx.fillStyle = PLAYER_COLORS.olho;
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
      ctx.fillStyle = PLAYER_PUPIL_COLOR;
      ctx.fillRect(mapX(eye1 + PLAYER_EYE_W / 2 - PLAYER_PUPIL_W / 2 + dx), mapY(pupilCenterY), PLAYER_PUPIL_W * z, mapH(PLAYER_PUPIL_H));
      ctx.fillRect(mapX(eye2 + PLAYER_EYE_W / 2 - PLAYER_PUPIL_W / 2 + dx), mapY(pupilCenterY), PLAYER_PUPIL_W * z, mapH(PLAYER_PUPIL_H));
    }

    // boca simples
    const mouthX = this.width / 2 - PLAYER_MOUTH_W / 2;
    ctx.fillStyle = PLAYER_COLORS.boca;
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
    ctx.fillStyle = PLAYER_COLORS.corpo;
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

    ctx.fillStyle = PLAYER_COLORS.perna;
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
    ctx.fillStyle = PLAYER_COLORS.braco;
    ctx.fillRect(mapX(armX + dx), mapY(PLAYER_HEAD_HEIGHT + armYOffset), PLAYER_ARM_WIDTH * z, mapH(PLAYER_ARM_HEIGHT));
  }

  // Braço da frente: golpe de mineração aponta e oscila em direção ao cursor.
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

    ctx.fillStyle = PLAYER_COLORS.braco;
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    if (this.mining) {
      const swing = Math.sin(this.animTime * Math.PI * 2 * PLAYER_MINE_SWING_SPEED) * PLAYER_MINE_SWING_AMPLITUDE;
      ctx.rotate(this.mineAngle + swing - Math.PI / 2);
      ctx.fillRect(-armW / 2, 0, armW, armLen);
    } else {
      ctx.fillRect(-armW / 2, 0, armW, armLen);
    }
    ctx.restore();
  }
}
