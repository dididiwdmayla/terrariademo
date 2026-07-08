import {
  LIGHT_ATTENUATION_AIR,
  LIGHT_ATTENUATION_SOLID,
  LIGHT_DARKNESS_GAMMA,
  LIGHT_MAX_LEVEL,
  LIGHT_RELIGHT_RADIUS,
  TILE_SIZE,
  TORCH_LIGHT_LEVEL,
} from "../config";
import { TILE_PROPS, TileType } from "./tiles";
import type { Camera } from "../engine/camera";
import type { World } from "./world";

const LEVELS = LIGHT_MAX_LEVEL + 1;

// Iluminação por tile em dois canais (céu e blocos/tochas), propagados por
// BFS com atenuação por tile. Mudanças de bloco/fonte refazem só uma caixa ao
// redor do ponto (as bordas da caixa entram como condição de contorno) — o
// mapa inteiro só é calculado uma vez, na geração. O render usa um overlay de
// escuridão em 1px/tile ampliado com interpolação bilinear (halo suave).
export class Lighting {
  private readonly skyLight: Uint8Array;
  private readonly blockLight: Uint8Array;
  private readonly skyTop: Int16Array; // primeiro y sólido por coluna; céu acima disso
  private readonly overlay: HTMLCanvasElement;
  private readonly overlayCtx: CanvasRenderingContext2D;
  private overlayData: ImageData | null = null;
  private readonly alphaLUT = new Uint8ClampedArray(LEVELS * LEVELS);
  private lutSkyFactor = -1;

  constructor(private readonly world: World) {
    this.skyLight = new Uint8Array(world.widthTiles * world.heightTiles);
    this.blockLight = new Uint8Array(world.widthTiles * world.heightTiles);
    this.skyTop = new Int16Array(world.widthTiles);
    this.overlay = document.createElement("canvas");
    this.overlay.width = 1;
    this.overlay.height = 1;
    const ctx = this.overlay.getContext("2d");
    if (!ctx) throw new Error("2D context não disponível para overlay de luz");
    this.overlayCtx = ctx;
  }

  // Cálculo completo (uma vez, após a geração do mundo).
  recomputeAll(): void {
    for (let x = 0; x < this.world.widthTiles; x++) this.recomputeSkyTop(x);
    this.relightBox(0, this.world.widthTiles - 1, 0, this.world.heightTiles - 1);
  }

  // Relight incremental: caixa ao redor da mudança, cobrindo também o trecho
  // da coluna cuja exposição ao céu mudou (ex.: cavar um poço abre luz p/ baixo).
  onTileChanged(x: number, y: number): void {
    const oldTop = this.skyTop[x];
    this.recomputeSkyTop(x);
    const newTop = this.skyTop[x];
    const r = LIGHT_RELIGHT_RADIUS;
    this.relightBox(x - r, x + r, Math.min(y, oldTop, newTop) - r, Math.max(y, oldTop, newTop) + r);
  }

  private recomputeSkyTop(x: number): void {
    const { tiles, widthTiles, heightTiles } = this.world;
    let y = 0;
    while (y < heightTiles && !TILE_PROPS[tiles[y * widthTiles + x] as TileType].solido) y++;
    this.skyTop[x] = y;
  }

  private relightBox(x0: number, x1: number, y0: number, y1: number): void {
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(this.world.widthTiles - 1, x1);
    y1 = Math.min(this.world.heightTiles - 1, y1);
    if (x0 > x1 || y0 > y1) return;
    this.relightChannel(this.skyLight, x0, x1, y0, y1, true);
    this.relightChannel(this.blockLight, x0, x1, y0, y1, false);
  }

  // BFS por buckets de nível (15 -> 1): cada tile é finalizado uma única vez.
  // A luz fora da caixa é tratada como fixa e entra pelas bordas; como nenhuma
  // mudança alcança além de LIGHT_RELIGHT_RADIUS, o resultado é exato.
  private relightChannel(light: Uint8Array, x0: number, x1: number, y0: number, y1: number, sky: boolean): void {
    const { tiles, widthTiles: w, heightTiles: h } = this.world;
    const buckets: number[][] = [];
    for (let l = 0; l < LEVELS; l++) buckets.push([]);

    // fontes dentro da caixa
    for (let y = y0; y <= y1; y++) {
      const row = y * w;
      for (let x = x0; x <= x1; x++) {
        const idx = row + x;
        let lv = 0;
        if (sky) {
          if (y < this.skyTop[x]) lv = LIGHT_MAX_LEVEL;
        } else if (tiles[idx] === TileType.TOCHA) {
          lv = TORCH_LIGHT_LEVEL;
        }
        light[idx] = lv;
        if (lv > 0) buckets[lv].push(idx);
      }
    }

    // influxo pelas bordas: luz externa entrando na caixa
    const influx = (idx: number, outIdx: number): void => {
      const att = TILE_PROPS[tiles[idx] as TileType].solido ? LIGHT_ATTENUATION_SOLID : LIGHT_ATTENUATION_AIR;
      const nl = light[outIdx] - att;
      if (nl > light[idx]) {
        light[idx] = nl;
        buckets[nl].push(idx);
      }
    };
    if (x0 > 0) for (let y = y0; y <= y1; y++) influx(y * w + x0, y * w + x0 - 1);
    if (x1 < w - 1) for (let y = y0; y <= y1; y++) influx(y * w + x1, y * w + x1 + 1);
    if (y0 > 0) for (let x = x0; x <= x1; x++) influx(y0 * w + x, (y0 - 1) * w + x);
    if (y1 < h - 1) for (let x = x0; x <= x1; x++) influx(y1 * w + x, (y1 + 1) * w + x);

    // propagação em ordem decrescente de nível
    for (let lv = LIGHT_MAX_LEVEL; lv >= 2; lv--) {
      const bucket = buckets[lv];
      for (let i = 0; i < bucket.length; i++) {
        const idx = bucket[i];
        if (light[idx] !== lv) continue; // entrada obsoleta (tile já melhorado)
        const x = idx % w;
        const y = (idx / w) | 0;
        if (x > x0) this.relax(light, buckets, idx - 1, lv);
        if (x < x1) this.relax(light, buckets, idx + 1, lv);
        if (y > y0) this.relax(light, buckets, idx - w, lv);
        if (y < y1) this.relax(light, buckets, idx + w, lv);
      }
    }
  }

  private relax(light: Uint8Array, buckets: number[][], nIdx: number, lv: number): void {
    const att = TILE_PROPS[this.world.tiles[nIdx] as TileType].solido ? LIGHT_ATTENUATION_SOLID : LIGHT_ATTENUATION_AIR;
    const nl = lv - att;
    if (nl > light[nIdx]) {
      light[nIdx] = nl;
      buckets[nl].push(nIdx);
    }
  }

  // Overlay de escuridão da área visível: 1px por tile, preto com alpha
  // 1 - luz/15, ampliado com smoothing bilinear p/ gradiente suave entre
  // tiles. Céu aberto (ar acima da superfície) fica transparente — a cor do
  // céu/estrelas já carrega a atmosfera do horário.
  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera, viewportW: number, viewportH: number, skyFactor: number): void {
    const { widthTiles: w, heightTiles: h, tiles, surfaceHeight } = this.world;
    const zoom = camera.zoom;
    const t0x = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const t0y = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const t1x = Math.min(w - 1, Math.floor((camera.x + viewportW / zoom) / TILE_SIZE) + 1);
    const t1y = Math.min(h - 1, Math.floor((camera.y + viewportH / zoom) / TILE_SIZE) + 1);
    const cols = t1x - t0x + 1;
    const rows = t1y - t0y + 1;
    if (cols <= 0 || rows <= 0) return;

    if (this.overlay.width < cols || this.overlay.height < rows) {
      this.overlay.width = Math.max(this.overlay.width, cols);
      this.overlay.height = Math.max(this.overlay.height, rows);
      this.overlayData = null;
    }
    if (!this.overlayData || this.overlayData.width !== cols || this.overlayData.height !== rows) {
      this.overlayData = this.overlayCtx.createImageData(cols, rows);
    }
    this.updateAlphaLUT(skyFactor);

    const data = this.overlayData.data;
    let p = 0;
    for (let ty = t0y; ty <= t1y; ty++) {
      const row = ty * w;
      for (let tx = t0x; tx <= t1x; tx++) {
        const idx = row + tx;
        const a =
          tiles[idx] === TileType.AR && ty <= surfaceHeight[tx]
            ? 0
            : this.alphaLUT[this.skyLight[idx] * LEVELS + this.blockLight[idx]];
        data[p] = 0;
        data[p + 1] = 0;
        data[p + 2] = 0;
        data[p + 3] = a;
        p += 4;
      }
    }
    this.overlayCtx.putImageData(this.overlayData, 0, 0);

    const camSX = Math.floor(camera.x * zoom);
    const camSY = Math.floor(camera.y * zoom);
    const scale = TILE_SIZE * zoom;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.overlay, 0, 0, cols, rows, t0x * scale - camSX, t0y * scale - camSY, cols * scale, rows * scale);
    ctx.imageSmoothingEnabled = false;
  }

  // Brilho [0,1] num tile (mesma curva do overlay), p/ iluminar entidades
  // desenhadas por cima do overlay (ex.: player).
  brightnessAt(tx: number, ty: number, skyFactor: number): number {
    const { widthTiles: w, heightTiles: h } = this.world;
    tx = Math.max(0, Math.min(w - 1, tx));
    ty = Math.max(0, Math.min(h - 1, ty));
    const idx = ty * w + tx;
    const eff = Math.min(1, Math.max(this.skyLight[idx] * skyFactor, this.blockLight[idx]) / LIGHT_MAX_LEVEL);
    return 1 - Math.pow(1 - eff, LIGHT_DARKNESS_GAMMA);
  }

  // LUT (céu x bloco) -> alpha da escuridão; o fator do céu aplica o dia/noite
  // sem refazer o BFS. Luz efetiva = max(céu * fator, bloco).
  private updateAlphaLUT(skyFactor: number): void {
    if (Math.abs(skyFactor - this.lutSkyFactor) < 0.002) return;
    this.lutSkyFactor = skyFactor;
    for (let s = 0; s < LEVELS; s++) {
      const effSky = s * skyFactor;
      for (let b = 0; b < LEVELS; b++) {
        const eff = Math.min(1, Math.max(effSky, b) / LIGHT_MAX_LEVEL);
        this.alphaLUT[s * LEVELS + b] = Math.round(255 * Math.pow(1 - eff, LIGHT_DARKNESS_GAMMA));
      }
    }
  }
}
