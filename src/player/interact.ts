import {
  MINE_CRACK_COLOR,
  MINE_CRACK_STAGES,
  MINE_HIGHLIGHT_COLOR,
  MINE_RANGE_TILES,
  MINE_SECONDS_PER_HARDNESS,
  PLACE_COOLDOWN,
  TILE_SIZE,
} from "../config";
import { TILE_DROP, TILE_PROPS, TileType } from "../world/tiles";
import type { Camera } from "../engine/camera";
import type { Input } from "../engine/input";
import type { World } from "../world/world";
import type { Player } from "./player";
import type { Inventory } from "./inventory";

// Mira do mouse, mineração (progresso proporcional à dureza) e construção.
export class Interaction {
  targetTx = 0;
  targetTy = 0;
  targetInRange = false;

  isMining(): boolean {
    return this.mineTx !== -1;
  }

  private mineTx = -1;
  private mineTy = -1;
  private mineProgress = 0;
  private mineFraction = 0;
  private placeCooldown = 0;

  update(dt: number, input: Input, camera: Camera, world: World, player: Player, inventory: Inventory): void {
    const worldPos = camera.screenToWorld(input.mouseX, input.mouseY);
    const tx = Math.floor(worldPos.x / TILE_SIZE);
    const ty = Math.floor(worldPos.y / TILE_SIZE);

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const tileCenterX = tx * TILE_SIZE + TILE_SIZE / 2;
    const tileCenterY = ty * TILE_SIZE + TILE_SIZE / 2;
    const dx = tileCenterX - playerCenterX;
    const dy = tileCenterY - playerCenterY;
    const rangePx = MINE_RANGE_TILES * TILE_SIZE;
    const inRange = dx * dx + dy * dy <= rangePx * rangePx;

    this.targetTx = tx;
    this.targetTy = ty;
    this.targetInRange = inRange;

    this.placeCooldown = Math.max(0, this.placeCooldown - dt);

    this.updateMining(dt, input, world, tx, ty, inRange, inventory);

    if (input.mouseRightDown && inRange && this.placeCooldown <= 0) {
      if (this.tryPlace(tx, ty, world, player, inventory)) this.placeCooldown = PLACE_COOLDOWN;
    }
  }

  private updateMining(dt: number, input: Input, world: World, tx: number, ty: number, inRange: boolean, inventory: Inventory): void {
    if (!input.mouseLeftDown || !inRange) {
      this.resetMining();
      return;
    }

    const tile = world.getTile(tx, ty);
    const props = TILE_PROPS[tile];
    // minerável = qualquer tile não-ar destrutível (inclui tocha, que não é sólida)
    if (tile === TileType.AR || props.dureza === Infinity) {
      this.resetMining();
      return;
    }

    if (tx !== this.mineTx || ty !== this.mineTy) {
      this.mineTx = tx;
      this.mineTy = ty;
      this.mineProgress = 0;
    }

    this.mineProgress += dt;
    const needed = props.dureza * MINE_SECONDS_PER_HARDNESS;
    this.mineFraction = Math.min(1, this.mineProgress / needed);

    if (this.mineProgress >= needed) {
      world.setTile(tx, ty, TileType.AR);
      inventory.add(TILE_DROP[tile], 1);
      this.resetMining();
    }
  }

  private resetMining(): void {
    this.mineTx = -1;
    this.mineTy = -1;
    this.mineProgress = 0;
    this.mineFraction = 0;
  }

  private tryPlace(tx: number, ty: number, world: World, player: Player, inventory: Inventory): boolean {
    if (world.getTile(tx, ty) !== TileType.AR) return false;

    const slot = inventory.selectedSlot();
    if (!slot || slot.count <= 0) return false;

    const adjacentSolid =
      TILE_PROPS[world.getTile(tx + 1, ty)].solido ||
      TILE_PROPS[world.getTile(tx - 1, ty)].solido ||
      TILE_PROPS[world.getTile(tx, ty + 1)].solido ||
      TILE_PROPS[world.getTile(tx, ty - 1)].solido;
    if (!adjacentSolid) return false;

    // só bloco sólido não pode sobrepor o player (tocha atravessável pode)
    if (TILE_PROPS[slot.tile].solido) {
      const tileX0 = tx * TILE_SIZE;
      const tileY0 = ty * TILE_SIZE;
      const overlapsPlayer =
        tileX0 < player.x + player.width &&
        tileX0 + TILE_SIZE > player.x &&
        tileY0 < player.y + player.height &&
        tileY0 + TILE_SIZE > player.y;
      if (overlapsPlayer) return false;
    }

    world.setTile(tx, ty, slot.tile);
    inventory.consumeSelected(1);
    return true;
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.targetInRange) return;
    const screen = camera.worldToScreen(this.targetTx * TILE_SIZE, this.targetTy * TILE_SIZE);
    const size = TILE_SIZE * camera.zoom;
    const sx = Math.round(screen.x);
    const sy = Math.round(screen.y);

    ctx.lineWidth = 2;
    ctx.strokeStyle = MINE_HIGHLIGHT_COLOR;
    ctx.strokeRect(sx + 1, sy + 1, size - 2, size - 2);

    if (this.mineTx === this.targetTx && this.mineTy === this.targetTy && this.mineFraction > 0) {
      const stage = Math.min(MINE_CRACK_STAGES - 1, Math.floor(this.mineFraction * MINE_CRACK_STAGES));
      this.drawCracks(ctx, sx, sy, size, stage);
    }
  }

  private drawCracks(ctx: CanvasRenderingContext2D, sx: number, sy: number, size: number, stage: number): void {
    ctx.strokeStyle = MINE_CRACK_COLOR;
    ctx.lineWidth = 1;
    const lines = stage + 1; // 1..MINE_CRACK_STAGES
    for (let i = 0; i < lines; i++) {
      const t = (i + 1) / (lines + 1);
      ctx.beginPath();
      ctx.moveTo(sx + size * t, sy);
      ctx.lineTo(sx + size * (t - 0.2), sy + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, sy + size * t);
      ctx.lineTo(sx + size, sy + size * (t - 0.2));
      ctx.stroke();
    }
  }
}
