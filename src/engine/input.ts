export class Input {
  private keysDown = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseLeftDown = false;
  mouseRightDown = false;
  private wheelDelta = 0;
  private rightPressLatch = false; // guarda cliques mais curtos que um frame

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (e.code.startsWith("Arrow")) e.preventDefault();
      this.keysDown.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keysDown.delete(e.code));

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouseLeftDown = true;
      if (e.button === 2) {
        this.mouseRightDown = true;
        this.rightPressLatch = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseLeftDown = false;
      if (e.button === 2) this.mouseRightDown = false;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.wheelDelta += Math.sign(e.deltaY);
      },
      { passive: false },
    );
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  // consome o clique direito registrado desde a última chamada; garante que
  // um clique down+up mais rápido que um passo do update ainda seja visto
  consumeRightPress(): boolean {
    const pressed = this.rightPressLatch;
    this.rightPressLatch = false;
    return pressed;
  }

  // consome o scroll acumulado desde a última chamada (evita processar 2x por frame)
  consumeWheelDelta(): number {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }
}
