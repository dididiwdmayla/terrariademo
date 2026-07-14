export type LeftJoystickMode = "floating" | "fixed";

// Preferências do jogador, editáveis no menu (F1) e persistidas junto do save
// no localStorage. Não são progresso de jogo, mas viajam no mesmo blob por
// simplicidade (ver src/world/save.ts).
export class Settings {
  leftJoystickMode: LeftJoystickMode = "floating";
  autoJump = true;

  toggleLeftJoystickMode(): void {
    this.leftJoystickMode = this.leftJoystickMode === "floating" ? "fixed" : "floating";
  }

  toggleAutoJump(): void {
    this.autoJump = !this.autoJump;
  }

  // Aplica valores salvos, ignorando campos ausentes/inválidos (mantém os
  // padrões atuais); nunca lança, mesmo com um save corrompido ou de uma
  // versão anterior a este recurso (que não tinha `settings` nenhum).
  applyFromSaved(saved: unknown): void {
    if (!saved || typeof saved !== "object") return;
    const s = saved as Record<string, unknown>;
    if (s.leftJoystickMode === "floating" || s.leftJoystickMode === "fixed") this.leftJoystickMode = s.leftJoystickMode;
    if (typeof s.autoJump === "boolean") this.autoJump = s.autoJump;
  }
}
