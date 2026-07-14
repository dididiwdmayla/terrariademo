import {
  SAVE_MENU_BUTTON_BG,
  SAVE_MENU_BUTTON_BORDER,
  SAVE_MENU_BUTTON_FONT,
  SAVE_MENU_BUTTON_GAP,
  SAVE_MENU_BUTTON_HEIGHT,
  SAVE_MENU_HEADER_COLOR,
  SAVE_MENU_HEADER_FONT,
  SAVE_MENU_HEADER_HEIGHT,
  SAVE_MENU_OVERLAY_COLOR,
  SAVE_MENU_PANEL_BG,
  SAVE_MENU_PANEL_BORDER,
  SAVE_MENU_PANEL_PADDING,
  SAVE_MENU_PANEL_WIDTH,
  SAVE_MENU_TEXT_COLOR,
  SAVE_MENU_TITLE_FONT,
} from "../config";
import type { Settings } from "../engine/settings";

export type SaveMenuAction = "new-world" | "erase-save" | "toggle-joystick-mode" | "toggle-auto-jump";

type Row =
  | { kind: "header"; label: string }
  | { kind: "button"; action: SaveMenuAction | "close"; label: string };

interface LayoutItem {
  row: Row;
  x: number;
  y: number;
  w: number;
  h: number;
}

const TITLE_AREA_HEIGHT = 28;

// Mini-menu, aberto com F1 (teclado) ou o botão discreto de toque. Seção de
// save: "Novo mundo" (nova seed, apaga o save atual) e "Apagar save" (o save
// some; o próximo carregamento usa o mundo padrão). Seção "Controles": toggles
// de preferência (joystick esquerdo fixo/flutuante, pulo automático) — clicar
// alterna o valor sem fechar o menu; as duas primeiras ações fecham o menu.
// Pausa o jogo enquanto aberto.
export class SaveMenu {
  open = false;

  constructor(private readonly settings: Settings) {}

  toggle(): void {
    this.open = !this.open;
  }

  private rows(): Row[] {
    return [
      { kind: "button", action: "new-world", label: "Novo mundo" },
      { kind: "button", action: "erase-save", label: "Apagar save" },
      { kind: "header", label: "Controles" },
      {
        kind: "button",
        action: "toggle-joystick-mode",
        label: `Joystick esquerdo: ${this.settings.leftJoystickMode === "fixed" ? "Fixo" : "Flutuante"}`,
      },
      { kind: "button", action: "toggle-auto-jump", label: `Pulo automático: ${this.settings.autoJump ? "Ligado" : "Desligado"}` },
      { kind: "button", action: "close", label: "Fechar" },
    ];
  }

  private layout(): { panelX: number; panelY: number; panelH: number; items: LayoutItem[] } {
    const rows = this.rows();
    const heights = rows.map((r) => (r.kind === "header" ? SAVE_MENU_HEADER_HEIGHT : SAVE_MENU_BUTTON_HEIGHT));
    const totalRowsH = heights.reduce((a, b) => a + b, 0) + (rows.length - 1) * SAVE_MENU_BUTTON_GAP;
    const panelH = SAVE_MENU_PANEL_PADDING * 2 + TITLE_AREA_HEIGHT + totalRowsH;
    const panelX = Math.round((window.innerWidth - SAVE_MENU_PANEL_WIDTH) / 2);
    const panelY = Math.round((window.innerHeight - panelH) / 2);

    let y = panelY + SAVE_MENU_PANEL_PADDING + TITLE_AREA_HEIGHT;
    const items: LayoutItem[] = rows.map((row, i) => {
      const h = heights[i];
      const item: LayoutItem = { row, x: panelX + SAVE_MENU_PANEL_PADDING, y, w: SAVE_MENU_PANEL_WIDTH - SAVE_MENU_PANEL_PADDING * 2, h };
      y += h + SAVE_MENU_BUTTON_GAP;
      return item;
    });
    return { panelX, panelY, panelH, items };
  }

  // processa um clique/toque em coordenadas de tela. "Novo mundo"/"Apagar
  // save"/"Fechar" fecham o menu e retornam a ação (null se fechou por
  // "Fechar" ou clicou fora); os toggles de Controles alternam o valor na
  // hora e mantêm o menu aberto, retornando a ação pra quem chamou persistir.
  handlePointer(px: number, py: number): SaveMenuAction | null {
    if (!this.open) return null;
    const { items } = this.layout();
    for (const item of items) {
      if (item.row.kind !== "button") continue;
      if (px < item.x || px > item.x + item.w || py < item.y || py > item.y + item.h) continue;

      const { action } = item.row;
      if (action === "close") {
        this.open = false;
        return null;
      }
      if (action === "toggle-joystick-mode") {
        this.settings.toggleLeftJoystickMode();
        return action;
      }
      if (action === "toggle-auto-jump") {
        this.settings.toggleAutoJump();
        return action;
      }
      this.open = false;
      return action;
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.open) return;
    const { panelX, panelY, panelH, items } = this.layout();

    ctx.fillStyle = SAVE_MENU_OVERLAY_COLOR;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.fillStyle = SAVE_MENU_PANEL_BG;
    ctx.fillRect(panelX, panelY, SAVE_MENU_PANEL_WIDTH, panelH);
    ctx.strokeStyle = SAVE_MENU_PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 0.5, panelY + 0.5, SAVE_MENU_PANEL_WIDTH - 1, panelH - 1);

    ctx.fillStyle = SAVE_MENU_TEXT_COLOR;
    ctx.font = SAVE_MENU_TITLE_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Menu", panelX + SAVE_MENU_PANEL_WIDTH / 2, panelY + SAVE_MENU_PANEL_PADDING);

    for (const item of items) {
      if (item.row.kind === "header") {
        ctx.fillStyle = SAVE_MENU_HEADER_COLOR;
        ctx.font = SAVE_MENU_HEADER_FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(item.row.label, item.x, item.y + item.h / 2 + 1);
        continue;
      }

      ctx.fillStyle = SAVE_MENU_BUTTON_BG;
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeStyle = SAVE_MENU_BUTTON_BORDER;
      ctx.strokeRect(item.x + 0.5, item.y + 0.5, item.w - 1, item.h - 1);
      ctx.fillStyle = SAVE_MENU_TEXT_COLOR;
      ctx.font = SAVE_MENU_BUTTON_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.row.label, item.x + item.w / 2, item.y + item.h / 2 + 1);
    }
  }
}
