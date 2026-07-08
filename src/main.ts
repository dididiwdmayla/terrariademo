import { Renderer } from "./engine/renderer";
import { Camera } from "./engine/camera";
import { Input } from "./engine/input";
import { FIXED_TIMESTEP, MAX_FRAME_DELTA, DEBUG_RECT_COLOR, DEBUG_RECT_SIZE } from "./config";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const camera = new Camera();
const input = new Input();

let accumulator = 0;
let lastTime = performance.now();

// estado de teste
const debugRect = { x: 0, y: 0, angle: 0 };

function update(dt: number): void {
  debugRect.angle += dt;
  debugRect.x = Math.cos(debugRect.angle) * 60;
  debugRect.y = Math.sin(debugRect.angle) * 60;

  void input; // input será usado a partir da fase de player
  void camera; // camera será usada a partir da fase de mundo
}

function render(): void {
  renderer.clear();
  const ctx = renderer.ctx;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  ctx.fillStyle = DEBUG_RECT_COLOR;
  ctx.fillRect(
    centerX + debugRect.x - DEBUG_RECT_SIZE / 2,
    centerY + debugRect.y - DEBUG_RECT_SIZE / 2,
    DEBUG_RECT_SIZE,
    DEBUG_RECT_SIZE,
  );
}

function loop(now: number): void {
  const frameDelta = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
  lastTime = now;
  accumulator += frameDelta;

  while (accumulator >= FIXED_TIMESTEP) {
    update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
