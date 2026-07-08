import { Renderer } from "./engine/renderer";
import { Camera } from "./engine/camera";
import { Input } from "./engine/input";
import { World } from "./world/world";
import { generateWorld } from "./world/gen";
import { Hud } from "./ui/hud";
import {
  CAMERA_PAN_FAST_MULT,
  CAMERA_PAN_SPEED,
  FIXED_TIMESTEP,
  MAX_FRAME_DELTA,
  TILE_SIZE,
  WORLD_SEED,
} from "./config";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const camera = new Camera();
const input = new Input();
const hud = new Hud();

const world = new World();
generateWorld(world, WORLD_SEED);

// câmera começa na superfície, no meio do mundo
const midX = world.widthTiles >> 1;
camera.centerOn(midX * TILE_SIZE, world.surfaceHeight[midX] * TILE_SIZE, window.innerWidth, window.innerHeight);
camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

function update(dt: number): void {
  // câmera livre por WASD/setas (sem player ainda)
  let dx = 0;
  let dy = 0;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) dx -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) dx += 1;
  if (input.isDown("KeyW") || input.isDown("ArrowUp")) dy -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const fast = input.isDown("ShiftLeft") || input.isDown("ShiftRight") ? CAMERA_PAN_FAST_MULT : 1;
    const diagonal = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
    const speed = CAMERA_PAN_SPEED * fast * diagonal;
    camera.x += dx * speed * dt;
    camera.y += dy * speed * dt;
  }
  camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);
}

let fps = 0;

function render(): void {
  renderer.clear();
  world.drawVisible(renderer.ctx, camera, window.innerWidth, window.innerHeight);
  hud.render(renderer.ctx, fps);
}

let accumulator = 0;
let lastTime = performance.now();

function loop(now: number): void {
  const frameDelta = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
  lastTime = now;
  accumulator += frameDelta;

  if (frameDelta > 0) fps += (1 / frameDelta - fps) * 0.05;

  while (accumulator >= FIXED_TIMESTEP) {
    update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
