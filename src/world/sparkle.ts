import { GOLD_TWINKLE_COLOR, GOLD_TWINKLE_SIZE, GOLD_TWINKLE_SPEED, TILE_SIZE } from "../config";
import { TileType, tileHash } from "./tiles";
import type { Camera } from "../engine/camera";
import type { World } from "./world";

// Cintilância lenta e determinística dos tiles de minério de ouro visíveis.
// Fica fora do cache de chunk (como a chama da tocha) porque anima com o tempo.
export function drawOreSparkles(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  timeSec: number,
  viewportW: number,
  viewportH: number,
): void {
  const zoom = camera.zoom;
  const camSX = Math.floor(camera.x * zoom);
  const camSY = Math.floor(camera.y * zoom);
  const minX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
  const minY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
  const maxX = Math.min(world.widthTiles - 1, Math.floor((camera.x + viewportW / zoom) / TILE_SIZE) + 1);
  const maxY = Math.min(world.heightTiles - 1, Math.floor((camera.y + viewportH / zoom) / TILE_SIZE) + 1);

  ctx.fillStyle = GOLD_TWINKLE_COLOR;
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (world.getTile(tx, ty) !== TileType.MINERIO_OURO) continue;

      const hsh = tileHash(tx, ty) ^ 0x51ed270b; // seed distinto do usado p/ variação de tom
      const phase = ((hsh >>> 8) & 0xffff) / 0x10000 * Math.PI * 2;
      const twinkle = 0.5 + 0.5 * Math.sin(timeSec * GOLD_TWINKLE_SPEED + phase);
      if (twinkle < 0.55) continue; // pisca só perto do pico, não fica sempre aceso

      const ox = ((hsh & 0xff) / 256) * (TILE_SIZE - GOLD_TWINKLE_SIZE);
      const oy = (((hsh >>> 16) & 0xff) / 256) * (TILE_SIZE - GOLD_TWINKLE_SIZE);
      const sx = tx * TILE_SIZE * zoom - camSX + ox * zoom;
      const sy = ty * TILE_SIZE * zoom - camSY + oy * zoom;

      ctx.globalAlpha = (twinkle - 0.55) / 0.45;
      ctx.fillRect(Math.round(sx), Math.round(sy), GOLD_TWINKLE_SIZE * zoom, GOLD_TWINKLE_SIZE * zoom);
    }
  }
  ctx.globalAlpha = 1;
}
