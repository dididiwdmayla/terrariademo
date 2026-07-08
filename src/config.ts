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
export const SURFACE_OCTAVES = 6;
export const SURFACE_MAX_STEP = 1; // diferença máxima de altura entre colunas vizinhas, em tiles
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
export const CAMERA_FOLLOW_SPEED = 8; // taxa do lerp de seguir o player (1/s)
export const CHUNK_CACHE_MAX = 160; // chunks com canvas cacheado antes de evicção

// --- Física ---
export const GRAVITY = 1500; // px/s^2
export const MAX_FALL_SPEED = 900; // px/s (velocidade terminal; < TILE_SIZE por step de 1/60s)
export const PHYSICS_EPS = 0.001; // folga p/ bordas de tile na colisão AABB

// --- Player: dimensões (2 tiles de altura x ~1.2 de largura) ---
export const PLAYER_WIDTH = 19; // px
export const PLAYER_HEIGHT = 32; // px

// --- Player: movimento ---
export const PLAYER_MOVE_SPEED = 220; // px/s, velocidade horizontal máxima
export const PLAYER_GROUND_ACCEL = 2600; // px/s^2
export const PLAYER_AIR_ACCEL = 1400; // px/s^2
export const PLAYER_GROUND_FRICTION = 2200; // px/s^2, desaceleração sem input no chão
export const PLAYER_AIR_FRICTION = 250; // px/s^2, desaceleração sem input no ar
export const PLAYER_JUMP_SPEED = 460; // px/s (~4.4 tiles de altura de pulo)
export const PLAYER_JUMP_CUT_SPEED = 140; // px/s, teto da subida ao soltar o pulo (altura variável)
export const PLAYER_COYOTE_TIME = 0.1; // segundos de pulo permitido após sair do chão

// --- Player: visual (desenho procedural) ---
export const PLAYER_COLORS = {
  corpo: "#3b6ea5",
  cabeca: "#e8b98a",
  olho: "#1c1c1c",
} as const;
export const PLAYER_HEAD_HEIGHT = 12; // px
export const PLAYER_EYE_Y = 4; // px a partir do topo da cabeça
export const PLAYER_EYE_W = 2; // px
export const PLAYER_EYE_H = 3; // px
export const PLAYER_EYE_X1 = 10; // px da borda esquerda, olhando p/ direita
export const PLAYER_EYE_X2 = 15;

// --- Game loop ---
export const FIXED_TIMESTEP = 1 / 60; // segundos
export const MAX_FRAME_DELTA = 0.25; // segundos, clamp p/ evitar spiral of death

// --- HUD ---
export const HUD_FONT = "12px monospace";
export const HUD_TEXT_COLOR = "#ffffff";
export const HUD_TEXT_SHADOW = "rgba(0, 0, 0, 0.7)";

// --- Mineração / Construção ---
export const MINE_RANGE_TILES = 5; // alcance do mouse, em tiles a partir do centro do player
export const MINE_SECONDS_PER_HARDNESS = 0.35; // segundos p/ minerar por ponto de dureza
export const MINE_CRACK_STAGES = 3;
export const MINE_HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.85)";
export const MINE_CRACK_COLOR = "rgba(20, 20, 20, 0.75)";
export const PLACE_COOLDOWN = 0.15; // segundos entre colocações com botão segurado

// --- Inventário / Hotbar ---
export const INVENTORY_SLOTS = 9;
export const INVENTORY_MAX_STACK = 999;
export const HOTBAR_SLOT_SIZE = 40; // px de tela (não escala com o zoom da câmera)
export const HOTBAR_SLOT_GAP = 4;
export const HOTBAR_MARGIN_BOTTOM = 12;
export const HOTBAR_ICON_PADDING = 6;
export const HOTBAR_FONT = "11px monospace";
export const HOTBAR_BG_COLOR = "rgba(20, 20, 24, 0.65)";
export const HOTBAR_BORDER_COLOR = "rgba(255, 255, 255, 0.3)";
export const HOTBAR_SELECTED_BORDER_COLOR = "#ffffff";
