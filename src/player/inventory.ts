import { INVENTORY_MAX_STACK, INVENTORY_SLOTS } from "../config";
import { TileType } from "../world/tiles";

export interface InventorySlot {
  tile: TileType;
  count: number;
}

// Inventário simples: 9 slots (a própria hotbar), stack até 999 por tipo.
export class Inventory {
  readonly slots: (InventorySlot | null)[] = new Array(INVENTORY_SLOTS).fill(null);
  selected = 0;

  add(tile: TileType, amount: number): void {
    const existing = this.slots.findIndex((s) => s !== null && s.tile === tile && s.count < INVENTORY_MAX_STACK);
    if (existing !== -1) {
      const slot = this.slots[existing]!;
      slot.count = Math.min(INVENTORY_MAX_STACK, slot.count + amount);
      return;
    }
    const empty = this.slots.findIndex((s) => s === null);
    if (empty !== -1) this.slots[empty] = { tile, count: Math.min(INVENTORY_MAX_STACK, amount) };
    // inventário cheio: item descartado
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
    if (!slot) return;
    slot.count -= amount;
    if (slot.count <= 0) this.slots[this.selected] = null;
  }
}
