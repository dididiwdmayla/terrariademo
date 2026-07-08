import {
  DAY_CYCLE_SECONDS,
  DAY_START_FRACTION,
  NIGHT_SKY_LIGHT,
  SKY_KEYFRAMES,
  STAR_CELL_PX,
  STAR_CHANCE,
  STAR_COLOR,
  STAR_TWINKLE_SPEED,
} from "../config";
import { tileHash } from "./tiles";
import type { Camera } from "../engine/camera";

interface Keyframe {
  t: number;
  r: number;
  g: number;
  b: number;
  luz: number;
}

// Keyframes pré-parseados (hex -> rgb) p/ interpolação por frame.
const KEYFRAMES: readonly Keyframe[] = SKY_KEYFRAMES.map((k) => {
  const n = parseInt(k.cor.slice(1), 16);
  return { t: k.t, r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, luz: k.luz };
});

// Ciclo dia/noite: relógio, cor do céu interpolada entre keyframes, fator da
// luz do céu e campo de estrelas procedural (hash por célula de grid).
export class DayNight {
  private timeSec = DAY_CYCLE_SECONDS * DAY_START_FRACTION;

  update(dt: number): void {
    this.timeSec = (this.timeSec + dt) % DAY_CYCLE_SECONDS;
  }

  get cycleT(): number {
    return this.timeSec / DAY_CYCLE_SECONDS;
  }

  set cycleT(t: number) {
    this.timeSec = ((t % 1) + 1) % 1 * DAY_CYCLE_SECONDS;
  }

  private sample(): { r: number; g: number; b: number; luz: number } {
    const t = this.cycleT;
    for (let i = 1; i < KEYFRAMES.length; i++) {
      if (t <= KEYFRAMES[i].t) {
        const a = KEYFRAMES[i - 1];
        const b = KEYFRAMES[i];
        const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
        return {
          r: Math.round(a.r + (b.r - a.r) * f),
          g: Math.round(a.g + (b.g - a.g) * f),
          b: Math.round(a.b + (b.b - a.b) * f),
          luz: a.luz + (b.luz - a.luz) * f,
        };
      }
    }
    const last = KEYFRAMES[KEYFRAMES.length - 1];
    return { r: last.r, g: last.g, b: last.b, luz: last.luz };
  }

  skyColor(): string {
    const s = this.sample();
    return `rgb(${s.r}, ${s.g}, ${s.b})`;
  }

  skyLightFactor(): number {
    return this.sample().luz;
  }

  // 0 = dia pleno, 1 = noite plena (controla o fade das estrelas).
  nightFactor(): number {
    const luz = this.sample().luz;
    return Math.max(0, Math.min(1, (1 - luz) / (1 - NIGHT_SKY_LIGHT)));
  }

  // Estrelas determinísticas por célula de grid em coordenadas de mundo,
  // desenhadas antes dos chunks (o terreno as oculta). Cintilam com o tempo.
  renderStars(ctx: CanvasRenderingContext2D, camera: Camera, viewportW: number, viewportH: number, timeSec: number): void {
    const night = this.nightFactor();
    if (night <= 0.02) return;

    const zoom = camera.zoom;
    const camSX = Math.floor(camera.x * zoom);
    const camSY = Math.floor(camera.y * zoom);
    const c0x = Math.floor(camera.x / STAR_CELL_PX);
    const c0y = Math.floor(camera.y / STAR_CELL_PX);
    const c1x = Math.floor((camera.x + viewportW / zoom) / STAR_CELL_PX);
    const c1y = Math.floor((camera.y + viewportH / zoom) / STAR_CELL_PX);

    ctx.fillStyle = STAR_COLOR;
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const hsh = tileHash(cx, cy);
        if ((hsh & 0xff) / 256 >= STAR_CHANCE) continue;
        const ox = (((hsh >>> 8) & 0xff) / 256) * STAR_CELL_PX;
        const oy = (((hsh >>> 16) & 0xff) / 256) * STAR_CELL_PX;
        const phase = (((hsh >>> 24) & 0xff) / 256) * Math.PI * 2;
        const size = ((hsh >>> 9) & 3) === 0 ? 2 : 1;
        const twinkle = 0.55 + 0.45 * Math.sin(timeSec * STAR_TWINKLE_SPEED + phase);
        ctx.globalAlpha = night * twinkle;
        ctx.fillRect(
          Math.round((cx * STAR_CELL_PX + ox) * zoom - camSX),
          Math.round((cy * STAR_CELL_PX + oy) * zoom - camSY),
          size * zoom,
          size * zoom,
        );
      }
    }
    ctx.globalAlpha = 1;
  }
}
