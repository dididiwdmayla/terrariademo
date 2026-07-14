import { INVENTORY_MAX_STACK, INVENTORY_SLOTS, ITEM_ICON_PICKAXE_SRC } from "../config";
import { TILE_PROPS, TileType } from "../world/tiles";

export enum ToolType {
  PICARETA = 0,
}

export interface ToolProps {
  minesTiles: boolean; // se a ação (clique/joystick) minera tiles com esta ferramenta selecionada
  iconSrc: string; // ícone da hotbar (imagem, não miniatura de cor)
}

export const TOOL_PROPS: Readonly<Record<ToolType, ToolProps>> = {
  [ToolType.PICARETA]: { minesTiles: true, iconSrc: ITEM_ICON_PICKAXE_SRC },
};

export type InventorySlot =
  | { kind: "tile"; tile: TileType; count: number }
  | { kind: "tool"; tool: ToolType };

// forma achatada de um slot p/ serialização (ver src/world/save.ts)
export type SavedSlot =
  | { kind: "tile"; tile: number; count: number }
  | { kind: "tool"; tool: number };

// Inventário simples: 9 slots (a própria hotbar). Blocos/tochas empilham até
// 999; ferramentas (picareta) ocupam um slot inteiro, não empilham e não são
// consumidas ao usar.
export class Inventory {
  readonly slots: (InventorySlot | null)[] = new Array(INVENTORY_SLOTS).fill(null);
  selected = 0;

  add(tile: TileType, amount: number): void {
    const existing = this.slots.findIndex(
      (s) => s !== null && s.kind === "tile" && s.tile === tile && s.count < INVENTORY_MAX_STACK,
    );
    if (existing !== -1) {
      const slot = this.slots[existing] as { kind: "tile"; tile: TileType; count: number };
      slot.count = Math.min(INVENTORY_MAX_STACK, slot.count + amount);
      return;
    }
    const empty = this.slots.findIndex((s) => s === null);
    if (empty !== -1) this.slots[empty] = { kind: "tile", tile, count: Math.min(INVENTORY_MAX_STACK, amount) };
    // inventário cheio: item descartado
  }

  equipTool(index: number, tool: ToolType): void {
    if (index >= 0 && index < this.slots.length) this.slots[index] = { kind: "tool", tool };
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i++) this.slots[i] = null;
    this.selected = 0;
  }

  select(index: number): void {
    if (index >= 0 && index < this.slots.length) this.selected = index;
  }

  scroll(direction: number): void {
    const n = this.slots.length;
    this.selected = ((this.selected + Math.sign(direction)) % n + n) % n;
  }

  selectedSlot(): InventorySlot | null {
    return this.slots[this.selected];
  }

  consumeSelected(amount: number): void {
    const slot = this.slots[this.selected];
    if (!slot || slot.kind !== "tile") return; // ferramentas não são consumidas
    slot.count -= amount;
    if (slot.count <= 0) this.slots[this.selected] = null;
  }

  // Restaura os slots a partir de dados salvos, descartando entradas
  // inválidas (tile/ferramenta fora de faixa, contagem inválida) em vez de
  // travar o load por causa de um save corrompido.
  loadSlots(saved: readonly (SavedSlot | null)[], selected: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = saved[i];
      if (!s) {
        this.slots[i] = null;
        continue;
      }
      if (s.kind === "tool") {
        this.slots[i] = s.tool in TOOL_PROPS ? { kind: "tool", tool: s.tool as ToolType } : null;
      } else if (s.kind === "tile") {
        const tile = s.tile as TileType;
        const count = Math.floor(s.count);
        this.slots[i] =
          tile in TILE_PROPS && count > 0 ? { kind: "tile", tile, count: Math.min(INVENTORY_MAX_STACK, count) } : null;
      } else {
        this.slots[i] = null;
      }
    }
    this.select(selected);
  }
}
