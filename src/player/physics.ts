import {
  GRAVITY,
  MAX_FALL_SPEED,
  PHYSICS_EPS,
  PLAYER_AIR_ACCEL,
  PLAYER_AIR_FRICTION,
  PLAYER_COYOTE_TIME,
  PLAYER_CROUCH_SPEED_MULT,
  PLAYER_GROUND_ACCEL,
  PLAYER_GROUND_FRICTION,
  PLAYER_JUMP_CUT_SPEED,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
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

// Física de plataforma com fixed timestep: aceleração/fricção, gravidade,
// pulo variável com coyote time, e colisão AABB resolvida por eixo (X depois Y).
export function stepPlayer(player: Player, world: World, controls: Controls, dt: number): void {
  // --- horizontal: aceleração com input, fricção sem ---
  const dir: 1 | 0 | -1 = controls.right === controls.left ? 0 : controls.right ? 1 : -1;
  const maxSpeed = controls.crouch && player.grounded ? PLAYER_MOVE_SPEED * PLAYER_CROUCH_SPEED_MULT : PLAYER_MOVE_SPEED;
  if (dir !== 0) {
    const accel = player.grounded ? PLAYER_GROUND_ACCEL : PLAYER_AIR_ACCEL;
    player.vx += dir * accel * dt;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
    player.facing = dir;
  } else {
    const friction = (player.grounded ? PLAYER_GROUND_FRICTION : PLAYER_AIR_FRICTION) * dt;
    if (Math.abs(player.vx) <= friction) player.vx = 0;
    else player.vx -= Math.sign(player.vx) * friction;
  }

  // --- pulo: coyote time + altura variável ---
  player.coyoteTimer = player.grounded ? PLAYER_COYOTE_TIME : Math.max(0, player.coyoteTimer - dt);
  const jumpPressed = controls.jump && !player.jumpHeld;
  if (jumpPressed && player.coyoteTimer > 0) {
    player.vy = -PLAYER_JUMP_SPEED;
    player.coyoteTimer = 0;
    player.grounded = false;
  }
  // soltar o botão durante a subida corta o pulo
  if (!controls.jump && player.vy < -PLAYER_JUMP_CUT_SPEED) player.vy = -PLAYER_JUMP_CUT_SPEED;
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
