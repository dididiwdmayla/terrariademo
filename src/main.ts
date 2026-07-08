import { Renderer } from "./engine/renderer";
import { Camera } from "./engine/camera";
import { Input } from "./engine/input";
import { World } from "./world/world";
import { generateWorld } from "./world/gen";
import { Player } from "./player/player";
import { stepPlayer, type Controls } from "./player/physics";
import { Inventory } from "./player/inventory";
import { Interaction } from "./player/interact";
import { Hud } from "./ui/hud";
import {
  CAMERA_FOLLOW_SPEED,
  FIXED_TIMESTEP,
  MAX_FRAME_DELTA,
  TILE_SIZE,
  WORLD_SEED,
} from "./config";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const camera = new Camera();
const input = new Input(canvas);
const hud = new Hud();
const inventory = new Inventory();
const interaction = new Interaction();

const world = new World();
generateWorld(world, WORLD_SEED);

// spawn na superfície, no centro do mundo
const player = new Player();
const midX = world.widthTiles >> 1;
player.x = midX * TILE_SIZE - player.width / 2;
player.y = world.surfaceHeight[midX] * TILE_SIZE - player.height;

camera.centerOn(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight);
camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

function update(dt: number): void {
  const controls: Controls = {
    left: input.isDown("KeyA") || input.isDown("ArrowLeft"),
    right: input.isDown("KeyD") || input.isDown("ArrowRight"),
    jump: input.isDown("Space") || input.isDown("KeyW") || input.isDown("ArrowUp"),
  };
  stepPlayer(player, world, controls, dt);

  // câmera segue o player com suavização e clamp nos limites do mundo
  const alpha = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * dt);
  camera.follow(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight, alpha);
  camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

  for (let i = 0; i < 9; i++) {
    if (input.isDown(`Digit${i + 1}`)) inventory.select(i);
  }
  const wheelDelta = input.consumeWheelDelta();
  if (wheelDelta !== 0) inventory.scroll(wheelDelta);

  interaction.update(dt, input, camera, world, player, inventory);
}

let fps = 0;

function render(): void {
  renderer.clear();
  world.drawVisible(renderer.ctx, camera, window.innerWidth, window.innerHeight);
  player.render(renderer.ctx, camera);
  interaction.render(renderer.ctx, camera);
  hud.render(renderer.ctx, fps, inventory);
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
