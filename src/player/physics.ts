// Física do player (colisão com o mundo virá em fase futura).

export function applyGravity(velocityY: number, gravity: number, dt: number, maxFallSpeed: number): number {
  return Math.min(velocityY + gravity * dt, maxFallSpeed);
}
