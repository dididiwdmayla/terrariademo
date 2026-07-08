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
export const PLAYER_MAX_HP = 100;

// --- Player: agachar (apenas visual + velocidade; hitbox não muda) ---
export const PLAYER_CROUCH_SPEED_MULT = 0.5; // fração de PLAYER_MOVE_SPEED ao agachar no chão
export const PLAYER_CROUCH_HEIGHT_MULT = 0.7; // fração da altura visual ao agachar

// --- Player: visual (desenho procedural articulado) ---
export const PLAYER_COLORS = {
  corpo: "#3b6ea5",
  cabeca: "#e8b98a",
  olho: "#1c1c1c",
  cabelo: "#3a2a1e",
  boca: "#7a4a3a",
  braco: "#d1a173",
  perna: "#2e4a63",
} as const;
export const PLAYER_HEAD_HEIGHT = 12; // px
export const PLAYER_HAIR_HEIGHT = 3; // px, faixa de cabelo no topo da cabeça
export const PLAYER_EYE_Y = 4; // px a partir do topo da cabeça
export const PLAYER_EYE_W = 2; // px
export const PLAYER_EYE_H = 3; // px
export const PLAYER_EYE_X1 = 10; // px da borda esquerda, olhando p/ direita
export const PLAYER_EYE_X2 = 15;
export const PLAYER_MOUTH_Y = 9; // px a partir do topo da cabeça
export const PLAYER_MOUTH_W = 4; // px
export const PLAYER_MOUTH_H = 1; // px

// --- Player: proporções do corpo articulado ---
export const PLAYER_TORSO_HEIGHT = 10; // px
export const PLAYER_TORSO_WIDTH = 13; // px
export const PLAYER_LEG_HEIGHT = 10; // px (head + torso + leg = PLAYER_HEIGHT)
export const PLAYER_LEG_WIDTH = 8; // px, cada perna
export const PLAYER_LEG_GAP = 3; // px entre as pernas
export const PLAYER_ARM_WIDTH = 5; // px
export const PLAYER_ARM_HEIGHT = 14; // px

// --- Player: animação ---
export const PLAYER_IDLE_BREATH_SPEED = 1.2; // ciclos/s da respiração parado
export const PLAYER_IDLE_BREATH_AMPLITUDE = 1; // px de deslocamento do tronco/cabeça
export const PLAYER_BLINK_MIN_INTERVAL = 2; // s, intervalo mínimo entre piscadas
export const PLAYER_BLINK_MAX_INTERVAL = 5; // s, intervalo máximo entre piscadas
export const PLAYER_BLINK_DURATION = 0.12; // s, duração do olho fechado
export const PLAYER_WALK_CYCLE_SPEED = 9; // ciclos/s do balanço de perna/braço na velocidade máxima
export const PLAYER_WALK_LEG_SWING = 4; // px de amplitude horizontal da perna ao andar
export const PLAYER_WALK_ARM_SWING = 4; // px de amplitude horizontal do braço ao andar
export const PLAYER_JUMP_LEG_BEND = 4; // px de encolhimento das pernas ao pular
export const PLAYER_JUMP_ARM_RAISE = 4; // px de elevação dos braços ao pular
export const PLAYER_FALL_ARM_SPREAD = 5; // px de abertura dos braços ao cair
export const PLAYER_FALL_LEG_SPREAD = 2; // px de abertura das pernas ao cair
export const PLAYER_MINE_SWING_SPEED = 7; // ciclos/s do golpe de mineração
export const PLAYER_MINE_SWING_AMPLITUDE = 0.8; // rad de amplitude do golpe em torno do cursor

// --- Game loop ---
export const FIXED_TIMESTEP = 1 / 60; // segundos
export const MAX_FRAME_DELTA = 0.25; // segundos, clamp p/ evitar spiral of death

// --- HUD ---
export const HUD_FONT = "12px monospace";
export const HUD_TEXT_COLOR = "#ffffff";
export const HUD_TEXT_SHADOW = "rgba(0, 0, 0, 0.7)";

// --- HUD: barra de vida ---
export const HEALTH_BAR_WIDTH = 160; // px de tela
export const HEALTH_BAR_HEIGHT = 14;
export const HEALTH_BAR_MARGIN = 10; // margem do canto superior esquerdo
export const HEALTH_BAR_BG_COLOR = "rgba(20, 20, 24, 0.65)";
export const HEALTH_BAR_BORDER_COLOR = "rgba(255, 255, 255, 0.3)";
export const HEALTH_BAR_FILL_COLOR = "#c0392b";
export const HEALTH_BAR_FILL_LOW_COLOR = "#7a1f17"; // abaixo de HEALTH_BAR_LOW_THRESHOLD
export const HEALTH_BAR_LOW_THRESHOLD = 0.3; // fração de vida p/ trocar de cor

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
