import { Renderer } from "./engine/renderer";
import { Camera } from "./engine/camera";
import { Input } from "./engine/input";
import { Particles } from "./engine/particles";
import { World } from "./world/world";
import { generateWorld } from "./world/gen";
import { DayNight } from "./world/daynight";
import { renderParallax } from "./world/parallax";
import { drawOreSparkles } from "./world/sparkle";
import { drawTorches, updateTorchSparks } from "./world/torches";
import { TileType } from "./world/tiles";
import { Player } from "./player/player";
import { stepPlayer, type Controls } from "./player/physics";
import { Inventory } from "./player/inventory";
import { Interaction } from "./player/interact";
import { Hud } from "./ui/hud";
import {
  CAMERA_FOLLOW_SPEED,
  FIXED_TIMESTEP,
  LANDING_FALL_SPEED_THRESHOLD,
  MAX_FRAME_DELTA,
  TILE_SIZE,
  TORCH_START_COUNT,
  WORLD_SEED,
} from "./config";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const camera = new Camera();
const input = new Input(canvas);
const hud = new Hud();
const inventory = new Inventory();
const interaction = new Interaction();
const dayNight = new DayNight();
const particles = new Particles();

const world = new World();
generateWorld(world, WORLD_SEED);

inventory.add(TileType.TOCHA, TORCH_START_COUNT);

// spawn na superfície, no centro do mundo
const player = new Player();
const midX = world.widthTiles >> 1;
player.x = midX * TILE_SIZE - player.width / 2;
player.y = world.surfaceHeight[midX] * TILE_SIZE - player.height;

camera.centerOn(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight);
camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

let animTime = 0;

function update(dt: number): void {
  animTime += dt;
  dayNight.update(dt);
  const crouch = input.isDown("KeyS") || input.isDown("ArrowDown");
  const controls: Controls = {
    left: input.isDown("KeyA") || input.isDown("ArrowLeft"),
    right: input.isDown("KeyD") || input.isDown("ArrowRight"),
    jump: input.isDown("Space") || input.isDown("KeyW") || input.isDown("ArrowUp"),
    crouch,
  };
  const wasGrounded = player.grounded;
  const vyBeforeStep = player.vy;
  stepPlayer(player, world, controls, dt);
  if (!wasGrounded && player.grounded && vyBeforeStep > LANDING_FALL_SPEED_THRESHOLD) {
    particles.spawnLandingDust(player.x + player.width / 2, player.y + player.height);
  }

  // câmera segue o player com suavização e clamp nos limites do mundo
  const alpha = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * dt);
  camera.follow(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight, alpha);
  camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

  for (let i = 0; i < 9; i++) {
    if (input.isDown(`Digit${i + 1}`)) inventory.select(i);
  }
  const wheelDelta = input.consumeWheelDelta();
  if (wheelDelta !== 0) inventory.scroll(wheelDelta);

  interaction.update(dt, input, camera, world, player, inventory, particles);

  const playerScreen = camera.worldToScreen(player.x + player.width / 2, player.y + player.height / 2);
  const mineAngle = Math.atan2(input.mouseY - playerScreen.y, input.mouseX - playerScreen.x);
  player.update(dt, crouch, interaction.isMining(), mineAngle);

  updateTorchSparks(dt, particles, world, camera, window.innerWidth, window.innerHeight);
  particles.update(dt);
}

let fps = 0;

function render(): void {
  renderer.clear(dayNight.skyColor());
  renderParallax(renderer.ctx, camera, window.innerWidth, window.innerHeight, dayNight.nightFactor(), animTime);
  dayNight.renderStars(renderer.ctx, camera, window.innerWidth, window.innerHeight, animTime);
  world.drawVisible(renderer.ctx, camera, window.innerWidth, window.innerHeight);
  drawOreSparkles(renderer.ctx, world, camera, animTime, window.innerWidth, window.innerHeight);
  // escuridão por cima do mundo; player e chamas das tochas vêm depois dela
  // (o player é sombreado pelo brilho do tile em que está)
  world.lighting.renderOverlay(renderer.ctx, camera, window.innerWidth, window.innerHeight, dayNight.skyLightFactor());
  const brightness = world.lighting.brightnessAt(
    Math.floor((player.x + player.width / 2) / TILE_SIZE),
    Math.floor((player.y + player.height / 2) / TILE_SIZE),
    dayNight.skyLightFactor(),
  );
  player.render(renderer.ctx, camera, brightness);
  drawTorches(renderer.ctx, world, camera, animTime, window.innerWidth, window.innerHeight);
  particles.render(renderer.ctx, camera, window.innerWidth, window.innerHeight);
  interaction.render(renderer.ctx, camera);
  hud.render(renderer.ctx, fps, inventory, player);
}

// handle de debug p/ inspeção manual e verificação automatizada
(window as unknown as Record<string, unknown>).__terra = { player, world, camera, dayNight, inventory };

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
