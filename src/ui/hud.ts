import {
  HOTBAR_BG_COLOR,
  HOTBAR_BORDER_COLOR,
  HOTBAR_FONT,
  HOTBAR_ICON_PADDING,
  HOTBAR_MARGIN_BOTTOM,
  HOTBAR_SELECTED_BORDER_COLOR,
  HOTBAR_SLOT_GAP,
  HOTBAR_SLOT_SIZE,
  HUD_FONT,
  HUD_TEXT_COLOR,
  HUD_TEXT_SHADOW,
  INVENTORY_SLOTS,
} from "../config";
import { TILE_VARIANTS } from "../world/tiles";
import type { Inventory } from "../player/inventory";

export class Hud {
  render(ctx: CanvasRenderingContext2D, fps: number, inventory: Inventory): void {
    ctx.font = HUD_FONT;
    this.drawShadowedText(ctx, `${Math.round(fps)} fps`, 8, 8, "left", "top");
    this.renderHotbar(ctx, inventory);
  }

  private renderHotbar(ctx: CanvasRenderingContext2D, inventory: Inventory): void {
    const totalW = INVENTORY_SLOTS * HOTBAR_SLOT_SIZE + (INVENTORY_SLOTS - 1) * HOTBAR_SLOT_GAP;
    const startX = Math.round((window.innerWidth - totalW) / 2);
    const y = Math.round(window.innerHeight - HOTBAR_MARGIN_BOTTOM - HOTBAR_SLOT_SIZE);

    ctx.font = HOTBAR_FONT;

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const x = startX + i * (HOTBAR_SLOT_SIZE + HOTBAR_SLOT_GAP);
      const slot = inventory.slots[i];
      const isSelected = i === inventory.selected;

      ctx.fillStyle = HOTBAR_BG_COLOR;
      ctx.fillRect(x, y, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE);
      ctx.strokeStyle = isSelected ? HOTBAR_SELECTED_BORDER_COLOR : HOTBAR_BORDER_COLOR;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, HOTBAR_SLOT_SIZE - 1, HOTBAR_SLOT_SIZE - 1);

      if (slot) {
        const pad = HOTBAR_ICON_PADDING;
        ctx.fillStyle = TILE_VARIANTS[slot.tile][2];
        ctx.fillRect(x + pad, y + pad, HOTBAR_SLOT_SIZE - pad * 2, HOTBAR_SLOT_SIZE - pad * 2);
        this.drawShadowedText(ctx, String(slot.count), x + HOTBAR_SLOT_SIZE - 3, y + HOTBAR_SLOT_SIZE - 3, "right", "bottom");
      }

      const label = String((i + 1) % 10);
      this.drawShadowedText(ctx, label, x + 3, y + 3, "left", "top");
    }
  }

  private drawShadowedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline,
  ): void {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = HUD_TEXT_SHADOW;
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.fillText(text, x, y);
  }
}
