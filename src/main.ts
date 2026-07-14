import { Renderer } from "./engine/renderer";
import { Camera } from "./engine/camera";
import { Input } from "./engine/input";
import { TouchControls } from "./engine/touch";
import { Settings } from "./engine/settings";
import { Particles } from "./engine/particles";
import { World } from "./world/world";
import { generateWorld } from "./world/gen";
import { DayNight } from "./world/daynight";
import { renderParallax } from "./world/parallax";
import { drawOreSparkles } from "./world/sparkle";
import { drawTorches, updateTorchSparks } from "./world/torches";
import { TileType, TILE_PROPS } from "./world/tiles";
import { applyTileDeltas, buildSaveData, clearStorage, readFromStorage, saveToStorage } from "./world/save";
import { Player } from "./player/player";
import { stepPlayer, type Controls } from "./player/physics";
import { Inventory, ToolType } from "./player/inventory";
import { Interaction } from "./player/interact";
import { Hud } from "./ui/hud";
import { SaveMenu, type SaveMenuAction } from "./ui/savemenu";
import {
  CAMERA_FOLLOW_SPEED,
  DAY_START_FRACTION,
  DUST_PARTICLE_COLOR,
  DUST_PARTICLE_COUNT,
  DUST_PARTICLE_LIFE,
  DUST_PARTICLE_SIZE,
  DUST_PARTICLE_SPEED,
  FIXED_TIMESTEP,
  FOOTSTEP_BURST_SPEED_THRESHOLD,
  FOOTSTEP_MIN_SPEED,
  FOOTSTEP_PARTICLE_COUNT_MAX,
  FOOTSTEP_PARTICLE_COUNT_MIN,
  FOOTSTEP_PARTICLE_LIFE,
  FOOTSTEP_PARTICLE_SIZE,
  FOOTSTEP_PARTICLE_SPEED,
  FOOTSTEP_STEP_DISTANCE,
  LANDING_FALL_SPEED_THRESHOLD,
  MAX_FRAME_DELTA,
  SAVE_AUTOSAVE_INTERVAL,
  TILE_SIZE,
  TORCH_START_COUNT,
  WORLD_SEED,
} from "./config";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const camera = new Camera();
const input = new Input(canvas);
const settings = new Settings();
const touchControls = new TouchControls(canvas, settings);
const hud = new Hud();
const saveMenu = new SaveMenu(settings);
const inventory = new Inventory();
const interaction = new Interaction();
const dayNight = new DayNight();
const particles = new Particles();
const world = new World();
const player = new Player();

let currentSeed = WORLD_SEED;
let originalTiles!: Uint8Array; // snapshot do mundo recém-gerado (mesma seed), usado p/ diff no save

function newWorldFromSeed(seed: number): void {
  currentSeed = seed;
  generateWorld(world, seed);
  originalTiles = world.tiles.slice();
}

function resetInventoryDefaults(): void {
  inventory.clear();
  inventory.equipTool(0, ToolType.PICARETA);
  inventory.add(TileType.TOCHA, TORCH_START_COUNT);
  inventory.select(0);
}

function spawnPlayerAtSurface(): void {
  const midX = world.widthTiles >> 1;
  player.x = midX * TILE_SIZE - player.width / 2;
  player.y = world.surfaceHeight[midX] * TILE_SIZE - player.height;
  player.vx = 0;
  player.vy = 0;
}

// Cor do tile logo abaixo dos pés do player, usada nos puffs/rajadas de poeira; +0.5 evita que
// imprecisão de ponto flutuante na borda exata do tile aponte pro tile de cima por engano.
function feetTileColor(): string {
  const tx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
  const ty = Math.floor((player.y + player.height + 0.5) / TILE_SIZE);
  return TILE_PROPS[world.getTile(tx, ty)].cor || DUST_PARTICLE_COLOR;
}

// boot: carrega o save (se válido e da mesma versão) ou gera o mundo padrão
const savedGame = readFromStorage();
if (savedGame) {
  newWorldFromSeed(savedGame.seed);
  applyTileDeltas(world, savedGame.tiles);
  inventory.loadSlots(savedGame.inventory, savedGame.selected);
  player.x = savedGame.playerX;
  player.y = savedGame.playerY;
  dayNight.cycleT = savedGame.dayNightT;
  settings.applyFromSaved(savedGame.settings);
} else {
  newWorldFromSeed(WORLD_SEED);
  resetInventoryDefaults();
  spawnPlayerAtSurface();
}

function recenterCamera(): void {
  camera.centerOn(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight);
  camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);
}
recenterCamera();

function saveGame(): void {
  saveToStorage(buildSaveData(world, originalTiles, currentSeed, inventory, player, dayNight, settings));
}
window.addEventListener("beforeunload", saveGame);

function applyMenuAction(action: SaveMenuAction): void {
  if (action === "toggle-joystick-mode" || action === "toggle-auto-jump") {
    saveGame(); // persiste a mudança de preferência imediatamente, junto do save
    return;
  }
  if (action === "erase-save") {
    clearStorage();
    return;
  }
  // novo mundo: seed aleatória, apaga o save atual e recomeça do zero
  clearStorage();
  newWorldFromSeed(Math.floor(Math.random() * 0xffffffff));
  resetInventoryDefaults();
  spawnPlayerAtSurface();
  dayNight.cycleT = DAY_START_FRACTION;
  recenterCamera();
}

let autosaveTimer = 0;
let animTime = 0;
let prevMoveDir: 1 | 0 | -1 = 0;

function update(dt: number): void {
  if (input.consumeKeyPress("F1")) saveMenu.toggle();
  if (touchControls.consumeMenuButtonTap()) saveMenu.toggle();
  touchControls.setMenuOpen(saveMenu.open);

  if (saveMenu.open) {
    if (input.consumeLeftPress()) {
      const action = saveMenu.handlePointer(input.mouseX, input.mouseY);
      if (action) applyMenuAction(action);
    }
    const tapPos = touchControls.consumeMenuTapPos();
    if (tapPos) {
      const action = saveMenu.handlePointer(tapPos.x, tapPos.y);
      if (action) applyMenuAction(action);
    }
    return; // jogo pausado enquanto o menu está aberto
  }

  animTime += dt;
  dayNight.update(dt);
  const crouch = input.isDown("KeyS") || input.isDown("ArrowDown") || touchControls.crouch;
  const sprint = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
  const controls: Controls = {
    left: input.isDown("KeyA") || input.isDown("ArrowLeft") || touchControls.left,
    right: input.isDown("KeyD") || input.isDown("ArrowRight") || touchControls.right,
    jump: input.isDown("Space") || input.isDown("KeyW") || input.isDown("ArrowUp") || touchControls.jump,
    crouch,
    sprint,
  };
  const dirNow: 1 | 0 | -1 = controls.right === controls.left ? 0 : controls.right ? 1 : -1;
  const wasGrounded = player.grounded;
  const vyBeforeStep = player.vy;
  const vxBeforeStep = player.vx;
  const xBeforeStep = player.x;
  stepPlayer(player, world, controls, dt, settings.autoJump);

  if (!wasGrounded && player.grounded && vyBeforeStep > LANDING_FALL_SPEED_THRESHOLD) {
    particles.spawnDust(
      player.x + player.width / 2,
      player.y + player.height,
      feetTileColor(),
      DUST_PARTICLE_COUNT,
      DUST_PARTICLE_SPEED,
      DUST_PARTICLE_LIFE,
      DUST_PARTICLE_SIZE,
    );
  }

  // puffs de passo: um a cada FOOTSTEP_STEP_DISTANCE px percorridos no chão
  if (player.grounded && Math.abs(player.vx) > FOOTSTEP_MIN_SPEED) {
    player.footstepDist += Math.abs(player.x - xBeforeStep);
    if (player.footstepDist >= FOOTSTEP_STEP_DISTANCE) {
      player.footstepDist -= FOOTSTEP_STEP_DISTANCE;
      const count =
        FOOTSTEP_PARTICLE_COUNT_MIN + Math.floor(Math.random() * (FOOTSTEP_PARTICLE_COUNT_MAX - FOOTSTEP_PARTICLE_COUNT_MIN + 1));
      particles.spawnDust(
        player.x + player.width / 2,
        player.y + player.height,
        feetTileColor(),
        count,
        FOOTSTEP_PARTICLE_SPEED,
        FOOTSTEP_PARTICLE_LIFE,
        FOOTSTEP_PARTICLE_SIZE,
      );
    }
  } else {
    player.footstepDist = 0;
  }

  // rajada maior: soltar a direção ou invertê-la bruscamente vindo de velocidade alta
  if (player.grounded && Math.abs(vxBeforeStep) > FOOTSTEP_BURST_SPEED_THRESHOLD) {
    const justReleased = prevMoveDir !== 0 && dirNow === 0;
    const justReversed = prevMoveDir !== 0 && dirNow !== 0 && dirNow !== prevMoveDir;
    if (justReleased || justReversed) {
      particles.spawnDust(
        player.x + player.width / 2,
        player.y + player.height,
        feetTileColor(),
        DUST_PARTICLE_COUNT,
        DUST_PARTICLE_SPEED,
        DUST_PARTICLE_LIFE,
        DUST_PARTICLE_SIZE,
      );
    }
  }
  prevMoveDir = dirNow;

  // câmera segue o player com suavização e clamp nos limites do mundo
  const alpha = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * dt);
  camera.follow(player.x + player.width / 2, player.y + player.height / 2, window.innerWidth, window.innerHeight, alpha);
  camera.clampToWorld(world.widthPx, world.heightPx, window.innerWidth, window.innerHeight);

  for (let i = 0; i < 9; i++) {
    if (input.isDown(`Digit${i + 1}`)) inventory.select(i);
  }
  const touchHotbarIdx = touchControls.consumeHotbarSelect();
  if (touchHotbarIdx !== null) inventory.select(touchHotbarIdx);
  const wheelDelta = input.consumeWheelDelta();
  if (wheelDelta !== 0) inventory.scroll(wheelDelta);

  // avança os temporizadores do modo de precisão (tap/lupa) do toque
  touchControls.update(dt);
  const touchPoint = touchControls.worldActionTarget();

  // enquanto o joystick de toque estiver ativo, ele substitui o mouse na mira de mineração/construção;
  // o tap exato/lupa de precisão (zona esquerda) tem prioridade sobre ambos
  const touchAimDir = touchControls.aimActive ? { x: touchControls.aimDirX, y: touchControls.aimDirY } : null;
  interaction.update(dt, input, camera, world, player, inventory, particles, touchAimDir, touchPoint);

  let mineAngle: number;
  if (touchPoint) {
    const playerScreen = camera.worldToScreen(player.x + player.width / 2, player.y + player.height / 2);
    mineAngle = Math.atan2(touchPoint.y - playerScreen.y, touchPoint.x - playerScreen.x);
  } else if (touchAimDir && (touchAimDir.x !== 0 || touchAimDir.y !== 0)) {
    mineAngle = Math.atan2(touchAimDir.y, touchAimDir.x);
  } else {
    const playerScreen = camera.worldToScreen(player.x + player.width / 2, player.y + player.height / 2);
    mineAngle = Math.atan2(input.mouseY - playerScreen.y, input.mouseX - playerScreen.x);
  }
  player.update(dt, crouch, sprint, interaction.isMining(), mineAngle);

  updateTorchSparks(dt, particles, world, camera, window.innerWidth, window.innerHeight);
  particles.update(dt);

  autosaveTimer += dt;
  if (autosaveTimer >= SAVE_AUTOSAVE_INTERVAL) {
    autosaveTimer = 0;
    saveGame();
  }
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
  touchControls.render(renderer.ctx, camera);
  saveMenu.render(renderer.ctx);
}

// handle de debug p/ inspeção manual e verificação automatizada
(window as unknown as Record<string, unknown>).__terra = {
  player,
  world,
  camera,
  dayNight,
  inventory,
  touchControls,
  interaction,
  settings,
  saveMenu,
  saveGame,
  clearSave: clearStorage,
  getSeed: () => currentSeed,
};

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
