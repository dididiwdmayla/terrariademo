import { CHUNK_SIZE_TILES } from "../config";
import { TileType } from "./tiles";

export class Chunk {
  readonly tiles: TileType[] = new Array(CHUNK_SIZE_TILES * CHUNK_SIZE_TILES).fill(TileType.Air);

  constructor(readonly chunkX: number, readonly chunkY: number) {}

  getTile(localX: number, localY: number): TileType {
    return this.tiles[localY * CHUNK_SIZE_TILES + localX];
  }

  setTile(localX: number, localY: number, type: TileType): void {
    this.tiles[localY * CHUNK_SIZE_TILES + localX] = type;
  }
}
