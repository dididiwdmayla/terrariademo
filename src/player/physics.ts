import {
  AUTO_JUMP_PROBE_PX,
  AUTO_JUMP_SPEED,
  GRAVITY,
  MAX_FALL_SPEED,
  PHYSICS_EPS,
  PLAYER_AIR_ACCEL,
  PLAYER_AIR_FRICTION,
  PLAYER_COYOTE_TIME,
  PLAYER_CROUCH_SPEED_MULT,
  PLAYER_GROUND_ACCEL,
  PLAYER_JUMP_CUT_SPEED,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_SPRINT_SPEED_MULT,
  PLAYER_STOP_TIME,
  TILE_SIZE,
} from "../config";
import { TILE_PROPS } from "../world/tiles";
import type { World } from "../world/world";
import type { Player } from "./player";

export interface Controls {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;
}

function rectHitsSolid(world: World, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE_SIZE);
  const x1 = Math.floor((x + w - PHYSICS_EPS) / TILE_SIZE);
  const y0 = Math.floor(y / TILE_SIZE);
  const y1 = Math.floor((y + h - PHYSICS_EPS) / TILE_SIZE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (TILE_PROPS[world.getTile(tx, ty)].solido) return true;
    }
  }
  return false;
}

// Detecta um degrau de EXATAMENTE 1 tile bem à frente do player (grudado no
// chão, na mesma linha dos pés) com espaço livre acima pra ele passar depois
// de subir. Degraus de 2+ tiles nunca disparam: exige o tile na linha da
// cabeça atual livre (senão a "parede" teria 2+ tiles de altura) e mais um
// tile de folga acima disso (senão o player bateria a cabeça ao subir).
function detectsOneTileStep(player: Player, world: World, dir: 1 | -1): boolean {
  const probeX = dir > 0 ? player.x + player.width + AUTO_JUMP_PROBE_PX : player.x - AUTO_JUMP_PROBE_PX;
  const tx = Math.floor(probeX / TILE_SIZE);
  const headRow = Math.floor(player.y / TILE_SIZE);
  const footRow = headRow + 1; // PLAYER_HEIGHT é exatamente 2 tiles; grounded => player.y alinhado à grade

  return (
    TILE_PROPS[world.getTile(tx, footRow)].solido &&
    !TILE_PROPS[world.getTile(tx, headRow)].solido &&
    !TILE_PROPS[world.getTile(tx, headRow - 1)].solido
  );
}

// Física de plataforma com fixed timestep: aceleração/fricção, gravidade,
// pulo variável com coyote time, e colisão AABB resolvida por eixo (X depois Y).
export function stepPlayer(player: Player, world: World, controls: Controls, dt: number, autoJumpEnabled: boolean): void {
  // --- horizontal: aceleração com input, fricção sem ---
  const dir: 1 | 0 | -1 = controls.right === controls.left ? 0 : controls.right ? 1 : -1;
  const maxSpeed =
    controls.crouch && player.grounded
      ? PLAYER_MOVE_SPEED * PLAYER_CROUCH_SPEED_MULT
      : controls.sprint && player.grounded
        ? PLAYER_MOVE_SPEED * PLAYER_SPRINT_SPEED_MULT
        : PLAYER_MOVE_SPEED;
  if (dir !== 0) {
    const accel = player.grounded ? PLAYER_GROUND_ACCEL : PLAYER_AIR_ACCEL;
    player.vx += dir * accel * dt;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
    player.facing = dir;
    player.stopTimer = 0;
  } else if (player.grounded) {
    // desaceleração em curva (não linear) até parar em exatamente PLAYER_STOP_TIME: a maior
    // parte da perda de velocidade acontece logo nos primeiros 50% do tempo, evitando o
    // "escorregão" de uma fricção linear constante
    if (player.stopTimer <= 0) player.stopVx = player.vx;
    player.stopTimer = Math.min(PLAYER_STOP_TIME, player.stopTimer + dt);
    const remaining = 1 - player.stopTimer / PLAYER_STOP_TIME;
    player.vx = player.stopVx * remaining * remaining;
  } else {
    player.stopTimer = 0;
    const friction = PLAYER_AIR_FRICTION * dt;
    if (Math.abs(player.vx) <= friction) player.vx = 0;
    else player.vx -= Math.sign(player.vx) * friction;
  }

  // --- pulo automático: sobe sozinho degraus de exatamente 1 tile ao andar no chão ---
  if (autoJumpEnabled && player.grounded && !controls.crouch && dir !== 0 && detectsOneTileStep(player, world, dir)) {
    player.vy = -AUTO_JUMP_SPEED;
    player.grounded = false;
    player.autoJumping = true;
  }
  if (player.grounded) player.autoJumping = false; // aterrissou: encerra a isenção do corte de altura

  // --- pulo: coyote time + altura variável ---
  player.coyoteTimer = player.grounded ? PLAYER_COYOTE_TIME : Math.max(0, player.coyoteTimer - dt);
  const jumpPressed = controls.jump && !player.jumpHeld;
  if (jumpPressed && player.coyoteTimer > 0) {
    player.vy = -PLAYER_JUMP_SPEED;
    player.coyoteTimer = 0;
    player.grounded = false;
    player.autoJumping = false; // pulo manual sobrepõe o automático: altura variável normal se aplica
  }
  // soltar o botão durante a subida corta o pulo (não se aplica ao pulo automático,
  // que não é "segurado" e por isso seria cortado no primeiro frame no ar)
  if (!player.autoJumping && !controls.jump && player.vy < -PLAYER_JUMP_CUT_SPEED) player.vy = -PLAYER_JUMP_CUT_SPEED;
  player.jumpHeld = controls.jump;

  // --- gravidade com velocidade terminal ---
  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

  // --- eixo X ---
  player.x += player.vx * dt;
  if (rectHitsSolid(world, player.x, player.y, player.width, player.height)) {
    if (player.vx > 0) {
      const tx = Math.floor((player.x + player.width - PHYSICS_EPS) / TILE_SIZE);
      player.x = tx * TILE_SIZE - player.width;
    } else if (player.vx < 0) {
      const tx = Math.floor(player.x / TILE_SIZE);
      player.x = (tx + 1) * TILE_SIZE;
    }
    player.vx = 0;
  }

  // --- eixo Y ---
  player.y += player.vy * dt;
  player.grounded = false;
  if (rectHitsSolid(world, player.x, player.y, player.width, player.height)) {
    if (player.vy > 0) {
      const ty = Math.floor((player.y + player.height - PHYSICS_EPS) / TILE_SIZE);
      player.y = ty * TILE_SIZE - player.height;
      player.grounded = true;
    } else if (player.vy < 0) {
      const ty = Math.floor(player.y / TILE_SIZE);
      player.y = (ty + 1) * TILE_SIZE;
    }
    player.vy = 0;
  }
}
