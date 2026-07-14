import { SAVE_KEY, SAVE_VERSION } from "../config";
import { TILE_COUNT, TileType } from "./tiles";
import type { World } from "./world";
import { type Inventory, type SavedSlot } from "../player/inventory";
import type { Player } from "../player/player";
import type { DayNight } from "./daynight";

export interface SaveData {
  version: number;
  seed: number;
  tiles: number[]; // pares [idx, tipo, idx, tipo, ...]: delta em relação ao mundo recém-gerado (regenerável pela seed)
  inventory: (SavedSlot | null)[];
  selected: number;
  playerX: number;
  playerY: number;
  dayNightT: number;
}

// Monta o save a partir do estado atual: só os tiles diferentes do mundo
// recém-gerado com a mesma seed entram no delta (o resto é regenerado).
export function buildSaveData(
  world: World,
  originalTiles: Uint8Array,
  seed: number,
  inventory: Inventory,
  player: Player,
  dayNight: DayNight,
): SaveData {
  const tiles: number[] = [];
  const current = world.tiles;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== originalTiles[i]) tiles.push(i, current[i]);
  }

  const invSlots: (SavedSlot | null)[] = inventory.slots.map((s) => {
    if (!s) return null;
    return s.kind === "tile" ? { kind: "tile", tile: s.tile, count: s.count } : { kind: "tool", tool: s.tool };
  });

  return {
    version: SAVE_VERSION,
    seed,
    tiles,
    inventory: invSlots,
    selected: inventory.selected,
    playerX: player.x,
    playerY: player.y,
    dayNightT: dayNight.cycleT,
  };
}

export function saveToStorage(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage indisponível ou cheio: falha silenciosa, não interrompe o jogo
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignora
  }
}

// Lê e valida o save salvo; save ausente, corrompido ou de versão antiga
// resulta em null (o chamador segue com o mundo padrão), nunca em exceção.
export function readFromStorage(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isValidSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === SAVE_VERSION &&
    typeof d.seed === "number" &&
    Number.isFinite(d.seed) &&
    Array.isArray(d.tiles) &&
    d.tiles.length % 2 === 0 &&
    Array.isArray(d.inventory) &&
    typeof d.selected === "number" &&
    typeof d.playerX === "number" &&
    typeof d.playerY === "number" &&
    typeof d.dayNightT === "number"
  );
}

// Aplica o delta de tiles sobre um mundo recém-gerado com a mesma seed e
// refaz iluminação + cache de chunks de uma vez só (bem mais barato que
// passar cada tile por World.setTile). Entradas fora de faixa são ignoradas
// em vez de corromper o mundo ou travar o load.
export function applyTileDeltas(world: World, tiles: readonly number[]): void {
  const max = world.tiles.length;
  for (let i = 0; i < tiles.length; i += 2) {
    const idx = tiles[i];
    const type = tiles[i + 1];
    if (idx < 0 || idx >= max || type < 0 || type >= TILE_COUNT) continue;
    world.tiles[idx] = type;
    if (type === TileType.TOCHA) world.torches.add(idx);
  }
  world.lighting.recomputeAll();
  world.markAllDirty();
}
