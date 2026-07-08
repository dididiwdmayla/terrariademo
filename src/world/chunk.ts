import {
  CHUNK_SIZE_TILES,
  DIRT_SPECK_COUNT,
  DIRT_SPECK_DARK_FACTOR,
  DIRT_SPECK_LIGHT_FACTOR,
  DIRT_SPECK_SIZE,
  GRASS_TUFT_COLOR_DARK,
  GRASS_TUFT_COLOR_LIGHT,
  GRASS_TUFT_COUNT,
  GRASS_TUFT_HEIGHT_MAX,
  GRASS_TUFT_HEIGHT_MIN,
  GRASS_TUFT_WIDTH,
  ORE_SHINE_COUNT,
  ORE_SHINE_FACTOR,
  ORE_SHINE_SIZE,
  STONE_CRACK_COUNT,
  STONE_CRACK_FACTOR,
  STONE_CRACK_LEN_MAX,
  STONE_CRACK_LEN_MIN,
  TILE_SIZE,
  TILE_SHADE_VARIANTS,
  TILE_TOP_LIGHT_PX,
} from "../config";
import {
  CAVE_BG_VARIANTS,
  TILE_PROPS,
  TILE_TOP_LIGHT,
  TILE_VARIANTS,
  TileType,
  shade,
  tileHash,
} from "./tiles";
import type { World } from "./world";

// LCG simples semeado pelo hash de posição p/ gerar sub-valores determinísticos.
function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export const CHUNK_PX = CHUNK_SIZE_TILES * TILE_SIZE;

// Um chunk mantém um canvas offscreen com seus tiles já desenhados em
// resolução nativa; o mundo só redesenha quando o chunk fica sujo.
export class Chunk {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  dirty = true;
  lastUsed = 0;

  constructor(
    readonly chunkX: number,
    readonly chunkY: number,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CHUNK_PX;
    this.canvas.height = CHUNK_PX;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context não disponível para chunk");
    this.ctx = ctx;
  }

  redraw(world: World): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CHUNK_PX, CHUNK_PX);
    const baseX = this.chunkX * CHUNK_SIZE_TILES;
    const baseY = this.chunkY * CHUNK_SIZE_TILES;
    const nVariants = TILE_SHADE_VARIANTS.length;

    for (let ty = 0; ty < CHUNK_SIZE_TILES; ty++) {
      const wy = baseY + ty;
      if (wy >= world.heightTiles) break;
      const py = ty * TILE_SIZE;
      for (let tx = 0; tx < CHUNK_SIZE_TILES; tx++) {
        const wx = baseX + tx;
        if (wx >= world.widthTiles) break;
        const px = tx * TILE_SIZE;
        const tile = world.getTile(wx, wy);
        const variant = tileHash(wx, wy) % nVariants;

        if (tile === TileType.AR || tile === TileType.TOCHA) {
          // ar acima da superfície fica transparente (céu); abaixo, fundo de
          // caverna. A tocha é desenhada dinamicamente (flicker) fora do cache.
          if (wy > world.surfaceHeight[wx]) {
            ctx.fillStyle = CAVE_BG_VARIANTS[variant];
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
          continue;
        }

        ctx.fillStyle = TILE_VARIANTS[tile][variant];
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // borda superior mais clara quando exposto ao ar
        const exposedTop = !TILE_PROPS[world.getTile(wx, wy - 1)].solido;
        if (exposedTop) {
          ctx.fillStyle = TILE_TOP_LIGHT[tile];
          ctx.fillRect(px, py, TILE_SIZE, TILE_TOP_LIGHT_PX);
        }

        this.drawTexture(ctx, tile, wx, wy, px, py, exposedTop);
      }
    }
    this.dirty = false;
  }

  // Textura procedural por tipo de tile, determinística por hash de posição
  // (mesmo tile sempre parece igual, independente de quantas vezes é redesenhado).
  private drawTexture(
    ctx: CanvasRenderingContext2D,
    tile: TileType,
    wx: number,
    wy: number,
    px: number,
    py: number,
    exposedTop: boolean,
  ): void {
    const rng = rngFrom(tileHash(wx, wy) ^ 0x9e3779b9);

    switch (tile) {
      case TileType.TERRA: {
        const baseColor = TILE_PROPS[tile].cor;
        for (let i = 0; i < DIRT_SPECK_COUNT; i++) {
          const sx = px + Math.floor(rng() * (TILE_SIZE - DIRT_SPECK_SIZE));
          const sy = py + Math.floor(rng() * (TILE_SIZE - DIRT_SPECK_SIZE));
          ctx.fillStyle = shade(baseColor, rng() < 0.5 ? DIRT_SPECK_DARK_FACTOR : DIRT_SPECK_LIGHT_FACTOR);
          ctx.fillRect(sx, sy, DIRT_SPECK_SIZE, DIRT_SPECK_SIZE);
        }
        break;
      }
      case TileType.PEDRA: {
        const baseColor = TILE_PROPS[tile].cor;
        ctx.strokeStyle = shade(baseColor, STONE_CRACK_FACTOR);
        ctx.lineWidth = 1;
        for (let i = 0; i < STONE_CRACK_COUNT; i++) {
          const len = STONE_CRACK_LEN_MIN + rng() * (STONE_CRACK_LEN_MAX - STONE_CRACK_LEN_MIN);
          const angle = rng() * Math.PI * 2;
          const cx = px + rng() * TILE_SIZE;
          const cy = py + rng() * TILE_SIZE;
          ctx.beginPath();
          ctx.moveTo(cx - (Math.cos(angle) * len) / 2, cy - (Math.sin(angle) * len) / 2);
          ctx.lineTo(cx + (Math.cos(angle) * len) / 2, cy + (Math.sin(angle) * len) / 2);
          ctx.stroke();
        }
        break;
      }
      case TileType.MINERIO_COBRE:
      case TileType.MINERIO_FERRO:
      case TileType.MINERIO_OURO: {
        const baseColor = TILE_PROPS[tile].cor;
        ctx.fillStyle = shade(baseColor, ORE_SHINE_FACTOR);
        for (let i = 0; i < ORE_SHINE_COUNT; i++) {
          const sx = px + Math.floor(rng() * (TILE_SIZE - ORE_SHINE_SIZE));
          const sy = py + Math.floor(rng() * (TILE_SIZE - ORE_SHINE_SIZE));
          ctx.fillRect(sx, sy, ORE_SHINE_SIZE, ORE_SHINE_SIZE);
        }
        // o cintilar lento do ouro é desenhado à parte, em cada frame (ver sparkle.ts).
        break;
      }
      case TileType.GRAMA: {
        if (!exposedTop) break;
        for (let i = 0; i < GRASS_TUFT_COUNT; i++) {
          const tuftH = GRASS_TUFT_HEIGHT_MIN + rng() * (GRASS_TUFT_HEIGHT_MAX - GRASS_TUFT_HEIGHT_MIN);
          const tx = px + rng() * (TILE_SIZE - GRASS_TUFT_WIDTH);
          const lean = (rng() - 0.5) * 3;
          ctx.fillStyle = rng() < 0.5 ? GRASS_TUFT_COLOR_LIGHT : GRASS_TUFT_COLOR_DARK;
          ctx.beginPath();
          ctx.moveTo(tx, py);
          ctx.lineTo(tx + GRASS_TUFT_WIDTH, py);
          ctx.lineTo(tx + GRASS_TUFT_WIDTH / 2 + lean, py - tuftH);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      default:
        break;
    }
  }
}
