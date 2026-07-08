// Todas as constantes tunáveis do jogo vivem aqui.

// --- Tiles / Mundo ---
export const TILE_SIZE = 16; // px por tile, em resolução nativa (antes do zoom)
export const WORLD_WIDTH_TILES = 1200;
export const WORLD_HEIGHT_TILES = 400;
export const CHUNK_SIZE_TILES = 32; // tiles por lado de chunk
export const WORLD_SEED = 1337;

// --- Geração: superfície (value noise 1D) ---
export const SURFACE_BASE_Y = 110; // linha média da superfície, em tiles
export const SURFACE_AMPLITUDE = 36; // meia-altura das colinas, em tiles
export const SURFACE_WAVELENGTH = 120; // largura característica das colinas, em tiles
export const SURFACE_OCTAVES = 4;
export const SURFACE_PERSISTENCE = 0.5;
export const SURFACE_MIN_Y = 20; // clamp de segurança da superfície
export const SURFACE_MAX_Y = 220;
export const DIRT_DEPTH_MIN = 4; // tiles de terra abaixo da grama
export const DIRT_DEPTH_MAX = 8;
export const DIRT_WAVELENGTH = 24; // variação da espessura da camada de terra

// --- Geração: cavernas (cellular automata) ---
export const CAVE_TOP_MARGIN = 6; // tiles de pedra preservados abaixo da terra
export const CAVE_AIR_CHANCE_TOP = 0.4; // chance inicial de ar no topo da pedra...
export const CAVE_AIR_CHANCE_BOTTOM = 0.5; // ...e no fundo (cavernas maiores no fundo)
export const CAVE_SMOOTH_PASSES = 5;
export const CAVE_WALL_THRESHOLD = 5; // vizinhos sólidos (janela 3x3) p/ virar parede

// --- Geração: minérios (veios por random walk) ---
export interface OreVeinConfig {
  veins: number; // quantidade de veios no mundo
  minLen: number; // passos do random walk
  maxLen: number;
  minDepth: number; // profundidade relativa à camada de pedra (0 = topo, 1 = fundo)
  maxDepth: number;
  branchChance: number; // chance de engrossar o veio a cada passo
}
export const ORE_COBRE: OreVeinConfig = { veins: 750, minLen: 6, maxLen: 14, minDepth: 0, maxDepth: 0.45, branchChance: 0.5 };
export const ORE_FERRO: OreVeinConfig = { veins: 450, minLen: 5, maxLen: 10, minDepth: 0.25, maxDepth: 0.75, branchChance: 0.4 };
export const ORE_OURO: OreVeinConfig = { veins: 190, minLen: 4, maxLen: 8, minDepth: 0.55, maxDepth: 1, branchChance: 0.35 };

// --- Cores ---
export const BACKGROUND_COLOR = "#7ec8f2"; // céu
export const CAVE_BG_COLOR = "#3b3129"; // fundo de caverna (ar subterrâneo)
export const TILE_COLORS = {
  GRAMA: "#4a9e3f",
  TERRA: "#8a5c34",
  PEDRA: "#7c7c84",
  AREIA: "#dbc981",
  MADEIRA: "#9a6a42",
  MINERIO_COBRE: "#c56f38",
  MINERIO_FERRO: "#c3b7a6",
  MINERIO_OURO: "#e6c34c",
  BEDROCK: "#2b2b31",
} as const;
export const TILE_SHADE_VARIANTS = [0.88, 0.95, 1, 1.06] as const; // fatores de variação de tom por posição
export const TILE_TOP_LIGHT_FACTOR = 1.35; // borda superior mais clara dos tiles expostos
export const TILE_TOP_LIGHT_PX = 2; // espessura da borda clara, em px nativos

// --- Dureza (golpes p/ quebrar; Infinity = indestrutível) ---
export const TILE_HARDNESS = {
  GRAMA: 1,
  TERRA: 1,
  PEDRA: 3,
  AREIA: 1,
  MADEIRA: 2,
  MINERIO_COBRE: 4,
  MINERIO_FERRO: 5,
  MINERIO_OURO: 5,
  BEDROCK: Infinity,
} as const;

// --- Câmera / Render ---
export const CAMERA_ZOOM = 2;
export const CAMERA_PAN_SPEED = 700; // px de mundo por segundo (modo câmera livre)
export const CAMERA_PAN_FAST_MULT = 3; // multiplicador segurando Shift
export const CHUNK_CACHE_MAX = 160; // chunks com canvas cacheado antes de evicção

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

// --- HUD ---
export const HUD_FONT = "12px monospace";
export const HUD_TEXT_COLOR = "#ffffff";
export const HUD_TEXT_SHADOW = "rgba(0, 0, 0, 0.7)";
