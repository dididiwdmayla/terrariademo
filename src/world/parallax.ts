import {
  CLOUD_CELL_PX,
  CLOUD_CHANCE,
  CLOUD_DAY_COLOR,
  CLOUD_DRIFT_PX_PER_SEC,
  CLOUD_HEIGHT_MAX,
  CLOUD_HEIGHT_MIN,
  CLOUD_NIGHT_COLOR,
  CLOUD_SPEED_FACTOR,
  CLOUD_WIDTH_MAX,
  CLOUD_WIDTH_MIN,
  CLOUD_Y_FRAC_MAX,
  CLOUD_Y_FRAC_MIN,
  PARALLAX_LAYERS,
} from "../config";
import { tileHash } from "./tiles";
import type { Camera } from "../engine/camera";

// Ruído de valor 1D suave (interpolação cosseno entre hashes em pontos inteiros),
// usado só p/ o perfil das colinas distantes — não tem relação com o terreno real.
function valueNoise1D(x: number, seed: number): number {
  const xi = Math.floor(x);
  const xf = x - xi;
  const h0 = (tileHash(xi, seed) & 0xffff) / 0xffff;
  const h1 = (tileHash(xi + 1, seed) & 0xffff) / 0xffff;
  const t = (1 - Math.cos(xf * Math.PI)) / 2;
  return h0 + (h1 - h0) * t;
}

function mixColor(dayColor: string, nightColor: string, night: number): string {
  const d = parseInt(dayColor.slice(1), 16);
  const n = parseInt(nightColor.slice(1), 16);
  const dr = (d >> 16) & 0xff,
    dg = (d >> 8) & 0xff,
    db = d & 0xff;
  const nr = (n >> 16) & 0xff,
    ng = (n >> 8) & 0xff,
    nb = n & 0xff;
  const r = Math.round(dr + (nr - dr) * night);
  const g = Math.round(dg + (ng - dg) * night);
  const b = Math.round(db + (nb - db) * night);
  return `rgb(${r}, ${g}, ${b})`;
}

// Camadas de colinas distantes + nuvens, desenhadas atrás do mundo. Cada
// camada rola numa fração da velocidade da câmera (parallax) e escurece
// suavemente à noite (mesmo fator de luz do céu usado no overlay).
export function renderParallax(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewportW: number,
  viewportH: number,
  nightFactor: number,
  timeSec: number,
): void {
  PARALLAX_LAYERS.forEach((layer, layerIdx) => {
    const color = mixColor(layer.dayColor, layer.nightColor, nightFactor);
    ctx.fillStyle = color;
    const baseY = viewportH * layer.baseHeightFrac;
    const camOffset = camera.x * layer.speedFactor;
    const step = 6; // px de tela entre amostras do perfil (suficiente p/ pixel art)

    ctx.beginPath();
    ctx.moveTo(0, viewportH);
    for (let sx = 0; sx <= viewportW; sx += step) {
      const worldSampleX = (sx + camOffset) / layer.wavelength;
      const n = valueNoise1D(worldSampleX, layerIdx * 1000 + 7);
      const y = baseY - n * layer.amplitude;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(viewportW, viewportH);
    ctx.closePath();
    ctx.fill();
  });

  renderClouds(ctx, camera, viewportW, viewportH, nightFactor, timeSec);
}

function renderClouds(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewportW: number,
  viewportH: number,
  nightFactor: number,
  timeSec: number,
): void {
  const camOffset = camera.x * CLOUD_SPEED_FACTOR + timeSec * CLOUD_DRIFT_PX_PER_SEC;
  const c0 = Math.floor((camOffset - CLOUD_WIDTH_MAX) / CLOUD_CELL_PX);
  const c1 = Math.floor((camOffset + viewportW + CLOUD_WIDTH_MAX) / CLOUD_CELL_PX);

  ctx.fillStyle = nightFactor > 0.5 ? CLOUD_NIGHT_COLOR : CLOUD_DAY_COLOR;
  for (let cx = c0; cx <= c1; cx++) {
    const hsh = tileHash(cx, 9001);
    if ((hsh & 0xff) / 256 >= CLOUD_CHANCE) continue;

    const w = CLOUD_WIDTH_MIN + (((hsh >>> 8) & 0xff) / 256) * (CLOUD_WIDTH_MAX - CLOUD_WIDTH_MIN);
    const h = CLOUD_HEIGHT_MIN + (((hsh >>> 16) & 0xff) / 256) * (CLOUD_HEIGHT_MAX - CLOUD_HEIGHT_MIN);
    const yFrac = CLOUD_Y_FRAC_MIN + (((hsh >>> 24) & 0xff) / 256) * (CLOUD_Y_FRAC_MAX - CLOUD_Y_FRAC_MIN);

    const sx = cx * CLOUD_CELL_PX - camOffset + CLOUD_CELL_PX / 2;
    const sy = viewportH * yFrac;
    if (sx + w / 2 < 0 || sx - w / 2 > viewportW) continue;

    ctx.beginPath();
    ctx.ellipse(sx, sy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - w * 0.28, sy + h * 0.15, w * 0.32, h * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + w * 0.3, sy + h * 0.1, w * 0.3, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
