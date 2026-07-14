import {
  HEALTH_BAR_BG_COLOR,
  HEALTH_BAR_BORDER_COLOR,
  HEALTH_BAR_FILL_COLOR,
  HEALTH_BAR_FILL_LOW_COLOR,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_LOW_THRESHOLD,
  HEALTH_BAR_MARGIN,
  HEALTH_BAR_WIDTH,
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
import type { Player } from "../player/player";

function hotbarLayout(): { startX: number; y: number } {
  const totalW = INVENTORY_SLOTS * HOTBAR_SLOT_SIZE + (INVENTORY_SLOTS - 1) * HOTBAR_SLOT_GAP;
  const startX = Math.round((window.innerWidth - totalW) / 2);
  const y = Math.round(window.innerHeight - HOTBAR_MARGIN_BOTTOM - HOTBAR_SLOT_SIZE);
  return { startX, y };
}

// índice do slot da hotbar sob um ponto de tela (px), ou null se fora dela; usado pelo toque
export function hotbarSlotIndexAt(px: number, py: number): number | null {
  const { startX, y } = hotbarLayout();
  if (py < y || py > y + HOTBAR_SLOT_SIZE) return null;
  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const x = startX + i * (HOTBAR_SLOT_SIZE + HOTBAR_SLOT_GAP);
    if (px >= x && px <= x + HOTBAR_SLOT_SIZE) return i;
  }
  return null;
}

// topo da hotbar em px de tela; usado pelos controles de toque p/ ancorar os botões acima dela sem sobrepor
export function hotbarTopY(): number {
  return hotbarLayout().y;
}

export class Hud {
  render(ctx: CanvasRenderingContext2D, fps: number, inventory: Inventory, player: Player): void {
    ctx.font = HUD_FONT;
    this.drawShadowedText(ctx, `${Math.round(fps)} fps`, 8, 8, "left", "top");
    this.renderHealthBar(ctx, player);
    this.renderHotbar(ctx, inventory);
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D, player: Player): void {
    const x = HEALTH_BAR_MARGIN;
    const y = HEALTH_BAR_MARGIN + 18; // abaixo do contador de fps
    const frac = Math.max(0, Math.min(1, player.hp / player.maxHp));

    ctx.fillStyle = HEALTH_BAR_BG_COLOR;
    ctx.fillRect(x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    ctx.fillStyle = frac <= HEALTH_BAR_LOW_THRESHOLD ? HEALTH_BAR_FILL_LOW_COLOR : HEALTH_BAR_FILL_COLOR;
    ctx.fillRect(x, y, HEALTH_BAR_WIDTH * frac, HEALTH_BAR_HEIGHT);

    ctx.strokeStyle = HEALTH_BAR_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, HEALTH_BAR_WIDTH - 1, HEALTH_BAR_HEIGHT - 1);

    this.drawShadowedText(
      ctx,
      `${Math.round(player.hp)}/${player.maxHp}`,
      x + HEALTH_BAR_WIDTH / 2,
      y + HEALTH_BAR_HEIGHT / 2,
      "center",
      "middle",
    );
  }

  private renderHotbar(ctx: CanvasRenderingContext2D, inventory: Inventory): void {
    const { startX, y } = hotbarLayout();

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
