import {
  TILE_SIZE,
  TORCH_FLAME_BASE_H,
  TORCH_FLAME_INNER,
  TORCH_FLAME_OUTER,
  TORCH_FLAME_OUTER_BRIGHT,
  TORCH_FLAME_VAR,
  TORCH_FLAME_W,
  TORCH_FLICKER_SPEED,
  TORCH_HANDLE_COLOR,
  TORCH_HANDLE_H,
  TORCH_HANDLE_W,
} from "../config";
import { tileHash } from "./tiles";
import type { Camera } from "../engine/camera";
import type { World } from "./world";

// Desenho dinâmico das tochas visíveis (fora do cache de chunk, porque a
// chama tem flicker procedural: altura e tom variam com o tempo, com fase
// determinística por posição).
export function drawTorches(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  timeSec: number,
  viewportW: number,
  viewportH: number,
): void {
  if (world.torches.size === 0) return;

  const zoom = camera.zoom;
  const camSX = Math.floor(camera.x * zoom);
  const camSY = Math.floor(camera.y * zoom);
  const minX = Math.floor(camera.x / TILE_SIZE) - 1;
  const minY = Math.floor(camera.y / TILE_SIZE) - 1;
  const maxX = Math.floor((camera.x + viewportW / zoom) / TILE_SIZE) + 1;
  const maxY = Math.floor((camera.y + viewportH / zoom) / TILE_SIZE) + 1;
  const w = world.widthTiles;

  for (const idx of world.torches) {
    const tx = idx % w;
    const ty = (idx / w) | 0;
    if (tx < minX || tx > maxX || ty < minY || ty > maxY) continue;

    const sx = tx * TILE_SIZE * zoom - camSX;
    const sy = ty * TILE_SIZE * zoom - camSY;

    // cabo de madeira, centrado na metade de baixo do tile
    ctx.fillStyle = TORCH_HANDLE_COLOR;
    const handleX = (TILE_SIZE - TORCH_HANDLE_W) / 2;
    ctx.fillRect(sx + handleX * zoom, sy + (TILE_SIZE - TORCH_HANDLE_H) * zoom, TORCH_HANDLE_W * zoom, TORCH_HANDLE_H * zoom);

    // chama: flicker procedural (duas senoides dessincronizadas por fase)
    const phase = ((tileHash(tx, ty) & 0xffff) / 0x10000) * Math.PI * 2;
    const flick =
      0.5 +
      0.3 * Math.sin(timeSec * TORCH_FLICKER_SPEED + phase) +
      0.2 * Math.sin(timeSec * TORCH_FLICKER_SPEED * 2.7 + phase * 1.7);
    const flameH = TORCH_FLAME_BASE_H + Math.round(flick * TORCH_FLAME_VAR);
    const flameX = (TILE_SIZE - TORCH_FLAME_W) / 2;
    const flameY = TILE_SIZE - TORCH_HANDLE_H - flameH;

    ctx.fillStyle = flick > 0.55 ? TORCH_FLAME_OUTER_BRIGHT : TORCH_FLAME_OUTER;
    ctx.fillRect(sx + flameX * zoom, sy + flameY * zoom, TORCH_FLAME_W * zoom, flameH * zoom);
    ctx.fillStyle = TORCH_FLAME_INNER;
    ctx.fillRect(sx + (flameX + 1) * zoom, sy + (flameY + 2) * zoom, (TORCH_FLAME_W - 2) * zoom, Math.max(1, flameH - 3) * zoom);
  }
}
