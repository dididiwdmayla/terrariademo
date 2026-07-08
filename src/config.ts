// Todas as constantes tunáveis do jogo vivem aqui.

// --- Mundo / Tiles ---
export const TILE_SIZE = 16; // px, em resolução nativa (antes do zoom)
export const WORLD_WIDTH_TILES = 400;
export const WORLD_HEIGHT_TILES = 200;
export const CHUNK_SIZE_TILES = 16; // tiles por lado de chunk

// --- Câmera / Render ---
export const CAMERA_ZOOM = 2;
export const BACKGROUND_COLOR = "#7ec8f2";

// --- Física ---
export const GRAVITY = 1200; // px/s^2
export const MAX_FALL_SPEED = 1000; // px/s

// --- Player ---
export const PLAYER_WIDTH = 20; // px
export const PLAYER_HEIGHT = 40; // px
export const PLAYER_MOVE_SPEED = 200; // px/s
export const PLAYER_JUMP_SPEED = 480; // px/s

// --- Game loop ---
export const FIXED_TIMESTEP = 1 / 60; // segundos
export const MAX_FRAME_DELTA = 0.25; // segundos, clamp p/ evitar spiral of death

// --- Debug / placeholder ---
export const DEBUG_RECT_COLOR = "#ff5555";
export const DEBUG_RECT_SIZE = 40; // px
