import {
  DUST_PARTICLE_LIFE,
  DUST_PARTICLE_SIZE,
  DUST_PARTICLE_SPEED,
  MINE_PARTICLE_COUNT_MAX,
  MINE_PARTICLE_COUNT_MIN,
  MINE_PARTICLE_LIFE,
  MINE_PARTICLE_SIZE,
  MINE_PARTICLE_SPEED,
  PARTICLE_GRAVITY,
  SPARK_PARTICLE_COLOR,
  SPARK_PARTICLE_DRIFT,
  SPARK_PARTICLE_LIFE,
  SPARK_PARTICLE_SIZE,
  SPARK_PARTICLE_SPEED,
} from "../config";
import type { Camera } from "./camera";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

// Sistema simples de partículas (fragmentos de mineração, poeira de aterrissagem,
// fagulhas de tocha): gravidade opcional + fade linear pelo tempo de vida.
export class Particles {
  private list: Particle[] = [];

  spawnMineDebris(worldX: number, worldY: number, color: string): void {
    const count = MINE_PARTICLE_COUNT_MIN + Math.floor(Math.random() * (MINE_PARTICLE_COUNT_MAX - MINE_PARTICLE_COUNT_MIN + 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * MINE_PARTICLE_SPEED;
      this.list.push({
        x: worldX,
        y: worldY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - MINE_PARTICLE_SPEED * 0.3,
        gravity: PARTICLE_GRAVITY,
        life: MINE_PARTICLE_LIFE,
        maxLife: MINE_PARTICLE_LIFE,
        size: MINE_PARTICLE_SIZE,
        color,
      });
    }
  }

  // Poeira genérica (leque p/ cima, espalhando p/ os lados): usada tanto pro puff de passo
  // quanto pra rajada maior de aterrissagem/freada/virada, variando cor/quantidade/velocidade/vida.
  spawnDust(
    worldX: number,
    worldY: number,
    color: string,
    count: number,
    speed: number = DUST_PARTICLE_SPEED,
    life: number = DUST_PARTICLE_LIFE,
    size: number = DUST_PARTICLE_SIZE,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + Math.random() * Math.PI;
      const s = Math.random() * speed;
      this.list.push({
        x: worldX,
        y: worldY,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s * 0.5,
        gravity: PARTICLE_GRAVITY * 0.3,
        life,
        maxLife: life,
        size,
        color,
      });
    }
  }

  spawnTorchSpark(worldX: number, worldY: number): void {
    this.list.push({
      x: worldX,
      y: worldY,
      vx: (Math.random() - 0.5) * SPARK_PARTICLE_DRIFT,
      vy: -SPARK_PARTICLE_SPEED * (0.6 + Math.random() * 0.6),
      gravity: -PARTICLE_GRAVITY * 0.15, // fagulha sobe (empuxo leve, contraria a gravidade)
      life: SPARK_PARTICLE_LIFE,
      maxLife: SPARK_PARTICLE_LIFE,
      size: SPARK_PARTICLE_SIZE,
      color: SPARK_PARTICLE_COLOR,
    });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, viewportW: number, viewportH: number): void {
    if (this.list.length === 0) return;
    const zoom = camera.zoom;
    const camSX = Math.floor(camera.x * zoom);
    const camSY = Math.floor(camera.y * zoom);

    for (const p of this.list) {
      const sx = p.x * zoom - camSX;
      const sy = p.y * zoom - camSY;
      if (sx < -8 || sy < -8 || sx > viewportW + 8 || sy > viewportH + 8) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      const size = p.size * zoom;
      ctx.fillRect(Math.round(sx - size / 2), Math.round(sy - size / 2), size, size);
    }
    ctx.globalAlpha = 1;
  }
}
