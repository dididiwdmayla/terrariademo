import {
  SAVE_MENU_BUTTON_BG,
  SAVE_MENU_BUTTON_BORDER,
  SAVE_MENU_BUTTON_FONT,
  SAVE_MENU_BUTTON_GAP,
  SAVE_MENU_BUTTON_HEIGHT,
  SAVE_MENU_OVERLAY_COLOR,
  SAVE_MENU_PANEL_BG,
  SAVE_MENU_PANEL_BORDER,
  SAVE_MENU_PANEL_PADDING,
  SAVE_MENU_PANEL_WIDTH,
  SAVE_MENU_TEXT_COLOR,
  SAVE_MENU_TITLE_FONT,
} from "../config";

export type SaveMenuAction = "new-world" | "erase-save";

interface MenuButton {
  action: SaveMenuAction | "close";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const TITLE_AREA_HEIGHT = 28;

// Mini-menu de save, aberto com F1 (teclado) ou o botão discreto de toque:
// "Novo mundo" (nova seed, apaga o save atual) e "Apagar save" (o save some;
// o próximo carregamento usa o mundo padrão). Pausa o jogo enquanto aberto.
export class SaveMenu {
  open = false;

  toggle(): void {
    this.open = !this.open;
  }

  private layout(): { panelX: number; panelY: number; panelH: number; buttons: MenuButton[] } {
    const labels: { action: SaveMenuAction | "close"; label: string }[] = [
      { action: "new-world", label: "Novo mundo" },
      { action: "erase-save", label: "Apagar save" },
      { action: "close", label: "Fechar" },
    ];
    const panelH =
      SAVE_MENU_PANEL_PADDING * 2 +
      TITLE_AREA_HEIGHT +
      labels.length * SAVE_MENU_BUTTON_HEIGHT +
      (labels.length - 1) * SAVE_MENU_BUTTON_GAP;
    const panelX = Math.round((window.innerWidth - SAVE_MENU_PANEL_WIDTH) / 2);
    const panelY = Math.round((window.innerHeight - panelH) / 2);

    let y = panelY + SAVE_MENU_PANEL_PADDING + TITLE_AREA_HEIGHT;
    const buttons: MenuButton[] = labels.map(({ action, label }) => {
      const btn: MenuButton = {
        action,
        label,
        x: panelX + SAVE_MENU_PANEL_PADDING,
        y,
        w: SAVE_MENU_PANEL_WIDTH - SAVE_MENU_PANEL_PADDING * 2,
        h: SAVE_MENU_BUTTON_HEIGHT,
      };
      y += SAVE_MENU_BUTTON_HEIGHT + SAVE_MENU_BUTTON_GAP;
      return btn;
    });
    return { panelX, panelY, panelH, buttons };
  }

  // processa um clique/toque em coordenadas de tela; fecha o menu e retorna a
  // ação escolhida (null se fechou por "Fechar" ou clicou fora dos botões)
  handlePointer(px: number, py: number): SaveMenuAction | null {
    if (!this.open) return null;
    const { buttons } = this.layout();
    for (const b of buttons) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        this.open = false;
        return b.action === "close" ? null : b.action;
      }
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.open) return;
    const { panelX, panelY, panelH, buttons } = this.layout();

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

    ctx.font = SAVE_MENU_BUTTON_FONT;
    ctx.textBaseline = "middle";
    for (const b of buttons) {
      ctx.fillStyle = SAVE_MENU_BUTTON_BG;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = SAVE_MENU_BUTTON_BORDER;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = SAVE_MENU_TEXT_COLOR;
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }
}
