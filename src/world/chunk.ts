import { CHUNK_SIZE_TILES, TILE_SIZE, TILE_SHADE_VARIANTS, TILE_TOP_LIGHT_PX } from "../config";
import {
  CAVE_BG_VARIANTS,
  TILE_PROPS,
  TILE_TOP_LIGHT,
  TILE_VARIANTS,
  TileType,
  tileHash,
} from "./tiles";
import type { World } from "./world";

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
        if (!TILE_PROPS[world.getTile(wx, wy - 1)].solido) {
          ctx.fillStyle = TILE_TOP_LIGHT[tile];
          ctx.fillRect(px, py, TILE_SIZE, TILE_TOP_LIGHT_PX);
        }
      }
    }
    this.dirty = false;
  }
}
