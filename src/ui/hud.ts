import { HUD_FONT, HUD_TEXT_COLOR, HUD_TEXT_SHADOW } from "../config";

export class Hud {
  render(ctx: CanvasRenderingContext2D, fps: number): void {
    const text = `${Math.round(fps)} fps`;
    ctx.font = HUD_FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = HUD_TEXT_SHADOW;
    ctx.fillText(text, 9, 9);
    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.fillText(text, 8, 8);
  }
}
