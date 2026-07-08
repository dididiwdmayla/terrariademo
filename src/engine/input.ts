export class Input {
  private keysDown = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.code.startsWith("Arrow")) e.preventDefault();
      this.keysDown.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keysDown.delete(e.code));
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }
}
