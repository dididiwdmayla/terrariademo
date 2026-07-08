import {
  PLAYER_COLORS,
  PLAYER_EYE_H,
  PLAYER_EYE_W,
  PLAYER_EYE_X1,
  PLAYER_EYE_X2,
  PLAYER_EYE_Y,
  PLAYER_HEAD_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_MAX_HP,
  PLAYER_WIDTH,
} from "../config";
import type { Camera } from "../engine/camera";

// Estado do jogador + desenho procedural (corpo, cabeça, olhos).
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

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const z = camera.zoom;
    const s = camera.worldToScreen(this.x, this.y);
    const px = Math.round(s.x);
    const py = Math.round(s.y);
    const headH = PLAYER_HEAD_HEIGHT * z;

    // corpo
    ctx.fillStyle = PLAYER_COLORS.corpo;
    ctx.fillRect(px, py + headH, this.width * z, this.height * z - headH);
    // cabeça
    ctx.fillStyle = PLAYER_COLORS.cabeca;
    ctx.fillRect(px, py, this.width * z, headH);
    // olhos virados pra direção do movimento
    const eye1 = this.facing === 1 ? PLAYER_EYE_X1 : this.width - PLAYER_EYE_X1 - PLAYER_EYE_W;
    const eye2 = this.facing === 1 ? PLAYER_EYE_X2 : this.width - PLAYER_EYE_X2 - PLAYER_EYE_W;
    ctx.fillStyle = PLAYER_COLORS.olho;
    ctx.fillRect(px + eye1 * z, py + PLAYER_EYE_Y * z, PLAYER_EYE_W * z, PLAYER_EYE_H * z);
    ctx.fillRect(px + eye2 * z, py + PLAYER_EYE_Y * z, PLAYER_EYE_W * z, PLAYER_EYE_H * z);
  }
}
