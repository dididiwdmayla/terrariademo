import {
  CHUNK_CACHE_MAX,
  CHUNK_SIZE_TILES,
  TILE_SIZE,
  WORLD_HEIGHT_TILES,
  WORLD_WIDTH_TILES,
} from "../config";
import { Chunk, CHUNK_PX } from "./chunk";
import { Lighting } from "./light";
import { TileType } from "./tiles";
import type { Camera } from "../engine/camera";

// Armazenamento do mundo em tiles + gerenciamento dos chunks de render.
export class World {
  readonly widthTiles = WORLD_WIDTH_TILES;
  readonly heightTiles = WORLD_HEIGHT_TILES;
  readonly widthPx = WORLD_WIDTH_TILES * TILE_SIZE;
  readonly heightPx = WORLD_HEIGHT_TILES * TILE_SIZE;
  readonly tiles = new Uint8Array(WORLD_WIDTH_TILES * WORLD_HEIGHT_TILES);
  readonly surfaceHeight = new Int16Array(WORLD_WIDTH_TILES); // y da grama por coluna
  readonly torches = new Set<number>(); // índices (y*w+x) das tochas colocadas
  readonly lighting = new Lighting(this);

  private readonly chunksX = Math.ceil(WORLD_WIDTH_TILES / CHUNK_SIZE_TILES);
  private readonly chunksY = Math.ceil(WORLD_HEIGHT_TILES / CHUNK_SIZE_TILES);
  private readonly chunks = new Map<number, Chunk>();
  private frame = 0;

  getTile(x: number, y: number): TileType {
    if (x < 0 || y < 0 || x >= this.widthTiles || y >= this.heightTiles) return TileType.BEDROCK;
    return this.tiles[y * this.widthTiles + x];
  }

  setTile(x: number, y: number, tile: TileType): void {
    if (x < 0 || y < 0 || x >= this.widthTiles || y >= this.heightTiles) return;
    const idx = y * this.widthTiles + x;
    const old = this.tiles[idx];
    if (old === tile) return;
    this.tiles[idx] = tile;
    if (old === TileType.TOCHA) this.torches.delete(idx);
    if (tile === TileType.TOCHA) this.torches.add(idx);
    this.lighting.onTileChanged(x, y);
    // autotiling: a aparência dos 8 vizinhos depende deste tile
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) this.markDirty(x + dx, y + dy);
    }
  }

  markAllDirty(): void {
    for (const chunk of this.chunks.values()) chunk.dirty = true;
  }

  private markDirty(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.widthTiles || y >= this.heightTiles) return;
    const cx = Math.floor(x / CHUNK_SIZE_TILES);
    const cy = Math.floor(y / CHUNK_SIZE_TILES);
    const chunk = this.chunks.get(cy * this.chunksX + cx);
    if (chunk) chunk.dirty = true;
  }

  // Desenha somente os chunks visíveis pela câmera + 1 chunk de margem.
  drawVisible(ctx: CanvasRenderingContext2D, camera: Camera, viewportW: number, viewportH: number): void {
    this.frame++;
    const zoom = camera.zoom;
    const camSX = Math.floor(camera.x * zoom);
    const camSY = Math.floor(camera.y * zoom);

    const c0x = Math.max(0, Math.floor(camera.x / CHUNK_PX) - 1);
    const c1x = Math.min(this.chunksX - 1, Math.floor((camera.x + viewportW / zoom) / CHUNK_PX) + 1);
    const c0y = Math.max(0, Math.floor(camera.y / CHUNK_PX) - 1);
    const c1y = Math.min(this.chunksY - 1, Math.floor((camera.y + viewportH / zoom) / CHUNK_PX) + 1);

    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const key = cy * this.chunksX + cx;
        let chunk = this.chunks.get(key);
        if (!chunk) {
          chunk = new Chunk(cx, cy);
          this.chunks.set(key, chunk);
        }
        if (chunk.dirty) chunk.redraw(this);
        chunk.lastUsed = this.frame;
        ctx.drawImage(
          chunk.canvas,
          cx * CHUNK_PX * zoom - camSX,
          cy * CHUNK_PX * zoom - camSY,
          CHUNK_PX * zoom,
          CHUNK_PX * zoom,
        );
      }
    }
    this.evictStaleChunks();
  }

  private evictStaleChunks(): void {
    while (this.chunks.size > CHUNK_CACHE_MAX) {
      let oldestKey = -1;
      let oldestFrame = Infinity;
      for (const [key, chunk] of this.chunks) {
        if (chunk.lastUsed < oldestFrame) {
          oldestFrame = chunk.lastUsed;
          oldestKey = key;
        }
      }
      if (oldestKey === -1 || oldestFrame === this.frame) break;
      this.chunks.delete(oldestKey);
    }
  }
}
