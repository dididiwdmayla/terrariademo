import {
  EMPTY_HIGHLIGHT_COLOR,
  MINE_CRACK_COLOR,
  MINE_CRACK_STAGES,
  MINE_HIGHLIGHT_COLOR,
  MINE_RANGE_TILES,
  MINE_SECONDS_PER_HARDNESS,
  PLACE_COOLDOWN,
  PLACE_HIGHLIGHT_COLOR,
  TILE_SIZE,
} from "../config";
import { TILE_DROP, TILE_PROPS, TileType } from "../world/tiles";
import type { Camera } from "../engine/camera";
import type { Input } from "../engine/input";
import type { Particles } from "../engine/particles";
import type { World } from "../world/world";
import type { Player } from "./player";
import { TOOL_PROPS, type Inventory } from "./inventory";

// direção normalizada de mira (mundo), usada pelo joystick de toque no lugar do cursor do mouse
export interface TouchAimDir {
  x: number;
  y: number;
}

// modo da ação determinado pelo item selecionado: picareta só minera, bloco/tocha só constrói
type InteractionMode = "mine" | "place" | "none";

// Mira do mouse (ou joystick de toque). A ação (clique esquerdo/joystick) minera
// com a picareta selecionada ou constrói com um bloco/tocha selecionado — nunca
// as duas coisas ao mesmo tempo, e nada acontece com o slot vazio ou sem ação.
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
  private mode: InteractionMode = "none";

  update(
    dt: number,
    input: Input,
    camera: Camera,
    world: World,
    player: Player,
    inventory: Inventory,
    particles: Particles,
    touchAimDir: TouchAimDir | null = null,
  ): void {
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    this.mode = this.computeMode(inventory);

    if (touchAimDir) {
      this.updateTouchAim(dt, touchAimDir, world, player, inventory, particles);
      return;
    }

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

    this.updateMining(dt, input, world, tx, ty, inRange, inventory, particles);

    // o latch cobre cliques down+up mais rápidos que um passo do update
    const rightActive = input.consumeRightPress() || input.mouseRightDown;
    if (rightActive && inRange && this.placeCooldown <= 0) {
      if (this.tryPlace(tx, ty, world, player, inventory)) this.placeCooldown = PLACE_COOLDOWN;
    }
  }

  // picareta selecionada -> "mine"; bloco/tocha selecionado -> "place"; slot vazio
  // ou item sem ação associada -> "none" (nenhuma ação acontece)
  private computeMode(inventory: Inventory): InteractionMode {
    const slot = inventory.selectedSlot();
    if (!slot) return "none";
    if (slot.kind === "tool") return TOOL_PROPS[slot.tool].minesTiles ? "mine" : "none";
    return "place";
  }

  // enquanto o joystick de mira estiver ativo, minera continuamente o tile minerável mais próximo
  // (só se o modo for "mine") ou coloca continuamente no tile vazio válido mais próximo (só se "place"),
  // ambos na direção apontada — nunca as duas buscas ao mesmo tempo
  private updateTouchAim(
    dt: number,
    dir: TouchAimDir,
    world: World,
    player: Player,
    inventory: Inventory,
    particles: Particles,
  ): void {
    if (dir.x === 0 && dir.y === 0) {
      this.resetMining();
      this.targetInRange = false;
      return;
    }

    const originX = player.x + player.width / 2;
    const originY = player.y + player.height / 2;
    const rangePx = MINE_RANGE_TILES * TILE_SIZE;

    const mineTarget =
      this.mode === "mine"
        ? this.raycastTile(originX, originY, dir.x, dir.y, rangePx, (tx, ty) => {
            const tile = world.getTile(tx, ty);
            return tile !== TileType.AR && TILE_PROPS[tile].dureza !== Infinity;
          })
        : null;

    if (mineTarget) {
      this.targetTx = mineTarget.tx;
      this.targetTy = mineTarget.ty;
      this.targetInRange = true;
      this.tryMine(dt, world, mineTarget.tx, mineTarget.ty, inventory, particles);
    } else {
      this.resetMining();
    }

    const placeTarget =
      this.mode === "place"
        ? this.raycastTile(originX, originY, dir.x, dir.y, rangePx, (tx, ty) =>
            this.canPlaceAt(tx, ty, world, player, inventory),
          )
        : null;
    if (placeTarget) {
      if (!mineTarget) {
        this.targetTx = placeTarget.tx;
        this.targetTy = placeTarget.ty;
        this.targetInRange = true;
      }
      if (this.placeCooldown <= 0 && this.tryPlace(placeTarget.tx, placeTarget.ty, world, player, inventory)) {
        this.placeCooldown = PLACE_COOLDOWN;
      }
    } else if (!mineTarget) {
      this.targetInRange = false;
    }
  }

  // caminha em passos de um tile a partir de (originX, originY) na direção (dirX, dirY) até maxDist,
  // retornando o primeiro tile que satisfaz o predicado (o mais próximo do jogador)
  private raycastTile(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    maxDist: number,
    predicate: (tx: number, ty: number) => boolean,
  ): { tx: number; ty: number } | null {
    const steps = Math.ceil(maxDist / TILE_SIZE);
    let lastTx = NaN;
    let lastTy = NaN;
    for (let i = 1; i <= steps; i++) {
      const d = Math.min(i * TILE_SIZE, maxDist);
      const wx = originX + dirX * d;
      const wy = originY + dirY * d;
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      if (tx === lastTx && ty === lastTy) continue;
      lastTx = tx;
      lastTy = ty;
      if (predicate(tx, ty)) return { tx, ty };
    }
    return null;
  }

  private updateMining(
    dt: number,
    input: Input,
    world: World,
    tx: number,
    ty: number,
    inRange: boolean,
    inventory: Inventory,
    particles: Particles,
  ): void {
    if (!input.mouseLeftDown || !inRange) {
      this.resetMining();
      return;
    }
    this.tryMine(dt, world, tx, ty, inventory, particles);
  }

  private tryMine(dt: number, world: World, tx: number, ty: number, inventory: Inventory, particles: Particles): void {
    // sem picareta selecionada, minerar é impossível: o tile não recebe dano
    if (this.mode !== "mine") {
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
      particles.spawnMineDebris((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, props.cor);
      this.resetMining();
    }
  }

  private resetMining(): void {
    this.mineTx = -1;
    this.mineTy = -1;
    this.mineProgress = 0;
    this.mineFraction = 0;
  }

  private canPlaceAt(tx: number, ty: number, world: World, player: Player, inventory: Inventory): boolean {
    if (world.getTile(tx, ty) !== TileType.AR) return false;

    const slot = inventory.selectedSlot();
    if (!slot || slot.kind !== "tile" || slot.count <= 0) return false;

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

    return true;
  }

  private tryPlace(tx: number, ty: number, world: World, player: Player, inventory: Inventory): boolean {
    if (!this.canPlaceAt(tx, ty, world, player, inventory)) return false;

    const slot = inventory.selectedSlot() as { kind: "tile"; tile: TileType; count: number };
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

    const highlightColor =
      this.mode === "mine" ? MINE_HIGHLIGHT_COLOR : this.mode === "place" ? PLACE_HIGHLIGHT_COLOR : EMPTY_HIGHLIGHT_COLOR;

    ctx.lineWidth = 2;
    ctx.strokeStyle = highlightColor;
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
