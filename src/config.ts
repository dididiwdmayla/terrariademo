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
  TOCHA: "#e8a33d",
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
  TOCHA: 1,
} as const;

// --- Autotiling (bordas orgânicas por bitmask de vizinhança) ---
export const EDGE_SEGMENT_PX = 4; // largura dos segmentos da aresta erodida, em px nativos
export const EDGE_RECESS_MIN = 1; // recuo mínimo da aresta exposta ao ar, em px
export const EDGE_RECESS_MAX = 3; // recuo máximo
export const CORNER_CHAMFER_MIN = 3; // chanfro do canto externo (dois lados expostos), em px
export const CORNER_CHAMFER_MAX = 4;
export const INNER_FILLET_PX = 3; // preenchimento côncavo do canto interno (diagonal de ar), em px
export const GRASS_DRIP_WIDTH = 2; // largura da escorrida verde na lateral do tile de terra, em px
export const GRASS_DRIP_LEN_MIN = 2; // comprimento da escorrida, em px
export const GRASS_DRIP_LEN_MAX = 4;
export const GROUP_TOOTH_DEPTH_MIN = 1; // dentes da transição entre grupos (terra→pedra), em px
export const GROUP_TOOTH_DEPTH_MAX = 2;

// --- Textura procedural dos tiles (determinística por hash de posição) ---
export const DIRT_SPECK_COUNT = 3; // pontinhos/pedrinhas por tile de terra
export const DIRT_SPECK_SIZE = 2; // px nativos
export const DIRT_SPECK_DARK_FACTOR = 0.62;
export const DIRT_SPECK_LIGHT_FACTOR = 1.5;
export const STONE_CRACK_COUNT = 2; // rachaduras sutis por tile de pedra
export const STONE_CRACK_FACTOR = 0.8; // tom (mais escuro) das rachaduras
export const STONE_CRACK_LEN_MIN = 4; // px nativos
export const STONE_CRACK_LEN_MAX = 9;
export const ORE_SHINE_FACTOR = 1.7; // brilho do ponto de destaque fixo do minério
export const ORE_SHINE_SIZE = 2; // px nativos
export const ORE_SHINE_COUNT = 2;
export const GOLD_TWINKLE_SPEED = 1.1; // rad/s do cintilar lento do ouro
export const GOLD_TWINKLE_COLOR = "#fff4c2";
export const GOLD_TWINKLE_SIZE = 2; // px nativos
export const GRASS_TUFT_COLOR_LIGHT = "#6fc95a";
export const GRASS_TUFT_COLOR_DARK = "#3d8232";
export const GRASS_TUFT_COUNT = 3; // tufos por tile de grama exposto
export const GRASS_TUFT_HEIGHT_MIN = 3; // px nativos, acima do tile
export const GRASS_TUFT_HEIGHT_MAX = 6;
export const GRASS_TUFT_WIDTH = 2; // px nativos

// --- Background parallax ---
export interface ParallaxLayerConfig {
  speedFactor: number; // fração da velocidade da câmera (0 = parado, 1 = junto do mundo)
  wavelength: number; // largura característica das colinas, em px de mundo
  amplitude: number; // altura das colinas, em px de mundo
  baseHeightFrac: number; // altura da base das colinas, fração da viewport a partir do topo
  dayColor: string;
  nightColor: string;
}
export const PARALLAX_LAYERS: readonly ParallaxLayerConfig[] = [
  { speedFactor: 0.15, wavelength: 420, amplitude: 70, baseHeightFrac: 0.62, dayColor: "#9db4c9", nightColor: "#1c2438" },
  { speedFactor: 0.32, wavelength: 260, amplitude: 100, baseHeightFrac: 0.7, dayColor: "#7f9bb3", nightColor: "#161d2f" },
  { speedFactor: 0.55, wavelength: 160, amplitude: 130, baseHeightFrac: 0.8, dayColor: "#5f7f9b", nightColor: "#101526" },
];
export const CLOUD_SPEED_FACTOR = 0.06; // fração da velocidade da câmera
export const CLOUD_DRIFT_PX_PER_SEC = 4; // deriva própria das nuvens, independente da câmera
export const CLOUD_CELL_PX = 340; // tamanho da célula do grid de nuvens, em px de mundo
export const CLOUD_CHANCE = 0.4; // chance de uma célula conter nuvem
export const CLOUD_WIDTH_MIN = 60;
export const CLOUD_WIDTH_MAX = 140;
export const CLOUD_HEIGHT_MIN = 18;
export const CLOUD_HEIGHT_MAX = 34;
export const CLOUD_Y_FRAC_MIN = 0.08; // faixa vertical das nuvens, fração da viewport
export const CLOUD_Y_FRAC_MAX = 0.4;
export const CLOUD_DAY_COLOR = "rgba(255, 255, 255, 0.75)";
export const CLOUD_NIGHT_COLOR = "rgba(150, 160, 190, 0.35)";

// --- Partículas ---
export const PARTICLE_GRAVITY = 700; // px/s^2
export const MINE_PARTICLE_COUNT_MIN = 4;
export const MINE_PARTICLE_COUNT_MAX = 6;
export const MINE_PARTICLE_SPEED = 90; // px/s, velocidade inicial máxima
export const MINE_PARTICLE_LIFE = 0.5; // segundos
export const MINE_PARTICLE_SIZE = 2; // px nativos
export const LANDING_FALL_SPEED_THRESHOLD = 420; // px/s, vy mínima p/ gerar poeira ao aterrissar
export const DUST_PARTICLE_COUNT = 6;
export const DUST_PARTICLE_SPEED = 60; // px/s
export const DUST_PARTICLE_LIFE = 0.4; // segundos
export const DUST_PARTICLE_SIZE = 2; // px nativos
export const DUST_PARTICLE_COLOR = "#c9c2b4"; // fallback quando não há cor de tile (ex.: sem chão sob o pé)

// --- Poeira de passos (puffs ao andar/correr; rajada maior ao frear, virar ou aterrissar) ---
export const FOOTSTEP_STEP_DISTANCE = 26; // px percorridos no chão entre passos
export const FOOTSTEP_MIN_SPEED = 20; // px/s abaixo disso não conta como andando
export const FOOTSTEP_PARTICLE_COUNT_MIN = 2;
export const FOOTSTEP_PARTICLE_COUNT_MAX = 3;
export const FOOTSTEP_PARTICLE_LIFE = 0.3; // segundos
export const FOOTSTEP_PARTICLE_SPEED = 25; // px/s
export const FOOTSTEP_PARTICLE_SIZE = 2; // px nativos
export const FOOTSTEP_BURST_SPEED_THRESHOLD = 150; // px/s: freada/virada acima disso dispara rajada maior
export const SPARK_SPAWN_CHANCE_PER_SEC = 2.5; // fagulhas/s por tocha visível
export const SPARK_PARTICLE_LIFE = 0.7; // segundos
export const SPARK_PARTICLE_SPEED = 14; // px/s, subida
export const SPARK_PARTICLE_DRIFT = 6; // px/s, deriva horizontal máxima
export const SPARK_PARTICLE_SIZE = 1; // px nativos
export const SPARK_PARTICLE_COLOR = "#f8d858";

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
export const PLAYER_STOP_TIME = 0.1; // segundos p/ desacelerar até parar no chão (curva, não instantâneo)
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
export const PLAYER_PUPIL_COLOR = "#000000";
export const PLAYER_PUPIL_W = 1; // px
export const PLAYER_PUPIL_H = 1; // px
export const PLAYER_PUPIL_OFFSET = 1; // px, amplitude do deslocamento em direção ao cursor (clampado às bordas do olho)
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
export const PLAYER_MINE_SWING_SPEED = 7; // golpes/s (ciclos do arco da picareta) durante a mineração

// --- Player: reação procedural (squash/stretch, inclinação, movimento secundário) ---
export const PLAYER_LAND_SQUASH_DURATION = 0.1; // s, duração da recuperação elástica ao aterrissar
export const PLAYER_LAND_SQUASH_MAX = 0.2; // fração de compressão vertical máxima (~20%)
export const PLAYER_LAND_SQUASH_WIDEN = 0.6; // fração do squash vertical espelhada como alargamento horizontal
export const PLAYER_JUMP_ANTICIPATION_DURATION = 0.045; // s (~2-3 frames a 60fps), agachadinha antes de subir
export const PLAYER_JUMP_ANTICIPATION_SQUASH = 0.12; // fração de compressão vertical na antecipação
export const PLAYER_JUMP_STRETCH_DURATION = 0.08; // s, esticada no impulso do pulo
export const PLAYER_JUMP_STRETCH_AMOUNT = 0.1; // fração de esticada vertical máxima (~10%)
export const PLAYER_LEAN_MAX_DEG = 6; // graus, inclinação máxima na direção do movimento
export const PLAYER_LEAN_SMOOTH_SPEED = 10; // 1/s, taxa de suavização (lerp exponencial) da inclinação
export const PLAYER_SECONDARY_LAG_FACTOR = 0.05; // px de offset por px/s de velocidade horizontal (alvo do spring)
export const PLAYER_SECONDARY_MAX_OFFSET = 4; // px, clamp do offset de movimento secundário
export const PLAYER_HAIR_SPRING_STIFFNESS = 140; // rigidez do spring do cabelo
export const PLAYER_HAIR_SPRING_DAMPING = 12; // amortecimento do spring do cabelo
export const PLAYER_ARM_SPRING_STIFFNESS = 200; // rigidez do spring da barra dos braços
export const PLAYER_ARM_SPRING_DAMPING = 16; // amortecimento do spring da barra dos braços

// --- Player: spritesheets (substituem o desenho procedural quando carregam) ---
// Todas as células têm 64x128 (personagem ancorado no pé, virado pra direita).
export const PLAYER_SHEET_FRAME_W = 64;
export const PLAYER_SHEET_FRAME_H = 128;
export const PLAYER_SPRITE_HEIGHT_TILES = 3; // altura do desenho (maior que a hitbox), ancorado pelo pé

export const PLAYER_WALK_SHEET_SRC = "/walk_sheet.png";
export const PLAYER_WALK_SHEET_COLS = 4; // grade 4x2, 8 frames
export const PLAYER_WALK_FRAME_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];
export const PLAYER_WALK_FRAME_SPEED = 10; // frames/s do ciclo de andar na velocidade máxima

export const PLAYER_RUN_SHEET_SRC = "/run_sheet.png";
export const PLAYER_RUN_SHEET_COLS = 3; // grade 3x2, 6 frames
export const PLAYER_RUN_FRAME_ORDER = [0, 1, 2, 3, 4, 5];
export const PLAYER_RUN_FRAME_SPEED = 14; // frames/s fixo do ciclo de corrida
export const PLAYER_SPRINT_SPEED_MULT = 1.6; // fração de PLAYER_MOVE_SPEED ao segurar sprint no chão

export const PLAYER_JUMP_SHEET_SRC = "/jump_sheet.png";
export const PLAYER_JUMP_SHEET_COLS = 2; // grade 2x2: antecipação, subindo, caindo, aterrissando
export const PLAYER_JUMP_FRAME_ANTICIPATION = 0;
export const PLAYER_JUMP_FRAME_RISING = 1;
export const PLAYER_JUMP_FRAME_FALLING = 2;
export const PLAYER_JUMP_FRAME_LANDING = 3;
export const PLAYER_JUMP_ANTICIPATION_FRAME_MS = 80; // ms de antecipação no impulso do pulo
export const PLAYER_LANDING_FRAME_MS = 100; // ms de frame de aterrissagem antes de voltar a idle/andar
// tempo contínuo no ar caindo (vy >= 0) antes de trocar pra pose/frame de queda; evita flicker em
// pulos e desníveis pequenos (o frame de impacto ao aterrissar só aparece se a queda passou desse tempo)
export const PLAYER_FALL_ANIM_DELAY_MS = 1000;

export const PLAYER_IDLE_SHEET_SRC = "/idle_sheet.png";
export const PLAYER_IDLE_SHEET_COLS = 3; // grade 3x2, 6 frames
export const PLAYER_IDLE_FRAME_ORDER = [0, 1, 2, 3, 4, 5];
export const PLAYER_IDLE_STAGE1_FRAME = 0; // parado, sem input recente
export const PLAYER_IDLE_WHISTLE_DELAY = 5; // s sem input antes de iniciar o ciclo de assovio
export const PLAYER_IDLE_WHISTLE_FRAME_SPEED = 6; // frames/s do ciclo de assovio

export const PLAYER_CROUCH_SHEET_SRC = "/crouch_sheet.png";
export const PLAYER_CROUCH_SHEET_COLS = 2; // grade 2x2; só o frame 0 (meio agachado) é usado como pose mantida
export const PLAYER_CROUCH_FRAME = 0; // meio agachado; frame 1 (agachado profundo) não é mais usado
export const PLAYER_CROUCH_HEIGHT_BLEND_MS = 120; // ms de interpolação suave da altura do desenho ao agachar/levantar

// --- Player: picareta (desenhada e rotacionada por código ao minerar) ---
export const PLAYER_PICKAXE_SRC = "/pickaxe.png";
export const PLAYER_PICKAXE_SIZE = 26; // px, no mesmo espaço de escala do frame do sprite (64x128), antes do zoom
// fração da imagem (64x64) onde fica a empunhadura, usada como pivô de rotação (obtida por inspeção de pixels)
export const PLAYER_PICKAXE_PIVOT_FRAC_X = 57 / 64;
export const PLAYER_PICKAXE_PIVOT_FRAC_Y = 62 / 64;
// ângulo (graus) do vetor empunhadura->cabeça em repouso na própria imagem, p/ alinhar com o ângulo de mira
export const PLAYER_PICKAXE_REST_ANGLE_DEG = -123;
export const PLAYER_PICKAXE_ARC_DEG = 100; // amplitude do arco de golpe em torno do ângulo de mira

// posição do ombro da frente dentro da célula 64x128 (personagem olhando pra direita), usada
// como pivô do braço/picareta; mesma posição serve pro braço de trás (a picareta é sempre da frente)
export const PLAYER_SPRITE_SHOULDER_X = 42; // px
export const PLAYER_SPRITE_SHOULDER_Y = 66; // px, a partir do topo da célula

// --- Iluminação (níveis 0-15 por tile, propagados por BFS) ---
export const LIGHT_MAX_LEVEL = 15;
export const LIGHT_ATTENUATION_AIR = 1; // níveis perdidos ao entrar num tile de ar
export const LIGHT_ATTENUATION_SOLID = 2; // ...num tile sólido
export const TORCH_LIGHT_LEVEL = 14; // emissão da tocha
export const LIGHT_RELIGHT_RADIUS = LIGHT_MAX_LEVEL + 1; // raio da caixa de relight incremental
export const LIGHT_DARKNESS_GAMMA = 1.25; // curva da escuridão (maior = halo mais aberto)

// --- Ciclo dia/noite ---
export const DAY_CYCLE_SECONDS = 600; // 10 minutos reais por ciclo completo
export const DAY_START_FRACTION = 0; // fração do ciclo em que o jogo começa (0 = amanhecer pleno)
export const NIGHT_SKY_LIGHT = 0.12; // fator mínimo da luz do céu à noite
export interface SkyKeyframe {
  t: number; // fração do ciclo [0, 1]
  cor: string; // cor do céu
  luz: number; // fator da luz do céu [NIGHT_SKY_LIGHT, 1]
}
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { t: 0.0, cor: BACKGROUND_COLOR, luz: 1 },
  { t: 0.4, cor: BACKGROUND_COLOR, luz: 1 },
  { t: 0.45, cor: "#e8874a", luz: 0.55 }, // crepúsculo laranja
  { t: 0.52, cor: "#0c1226", luz: NIGHT_SKY_LIGHT }, // noite azul-escura
  { t: 0.88, cor: "#0c1226", luz: NIGHT_SKY_LIGHT },
  { t: 0.95, cor: "#e8874a", luz: 0.55 }, // alvorada
  { t: 1.0, cor: BACKGROUND_COLOR, luz: 1 },
];

// --- Estrelas procedurais (noite) ---
export const STAR_CELL_PX = 24; // tamanho da célula do grid de estrelas, em px de mundo
export const STAR_CHANCE = 0.16; // chance de uma célula conter estrela
export const STAR_COLOR = "#e8ecff";
export const STAR_TWINKLE_SPEED = 1.7; // rad/s do cintilar

// --- Tocha (visual; a emissão de luz fica em TORCH_LIGHT_LEVEL) ---
export const TORCH_START_COUNT = 20; // tochas iniciais na hotbar
export const TORCH_HANDLE_COLOR = "#8a5c34";
export const TORCH_HANDLE_W = 2; // px
export const TORCH_HANDLE_H = 7; // px
export const TORCH_FLAME_W = 6; // px
export const TORCH_FLAME_BASE_H = 5; // px, altura mínima da chama
export const TORCH_FLAME_VAR = 3; // px, variação de altura pelo flicker
export const TORCH_FLAME_OUTER = "#e07b1f";
export const TORCH_FLAME_OUTER_BRIGHT = "#f0942d"; // tom alternativo nos picos do flicker
export const TORCH_FLAME_INNER = "#f8d858";
export const TORCH_FLICKER_SPEED = 9; // rad/s do flicker procedural

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
export const MINE_HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.85)"; // tom de quebra (picareta selecionada)
export const PLACE_HIGHLIGHT_COLOR = "rgba(120, 200, 255, 0.85)"; // tom de construção (bloco/tocha selecionado)
export const EMPTY_HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.35)"; // slot vazio ou sem ação: mira neutra
export const MINE_CRACK_COLOR = "rgba(20, 20, 20, 0.75)";
export const PLACE_COOLDOWN = 0.15; // segundos entre colocações com botão segurado

// --- Controles de toque (mobile, estilo Terraria) ---
// Botões: fração de min(innerWidth, innerHeight).
export const TOUCH_BUTTON_FONT_FRAC = 0.065;
export const TOUCH_BUTTON_BG_COLOR = "rgba(255, 255, 255, 0.25)"; // bem transparente em repouso
export const TOUCH_BUTTON_BG_ACTIVE_COLOR = "rgba(255, 255, 255, 0.5)"; // mais opaco quando pressionado
export const TOUCH_BUTTON_BORDER_COLOR = "rgba(255, 255, 255, 0.45)";
export const TOUCH_BUTTON_ICON_COLOR = "rgba(255, 255, 255, 0.92)";

// Joysticks: cores compartilhadas entre o de movimento (esquerda) e o de mira
// (direita); ambos FIXOS num canto da tela (não nascem no primeiro toque).
export const TOUCH_JOYSTICK_KNOB_FRAC = 0.45; // raio do manípulo, fração do raio externo
export const TOUCH_JOYSTICK_DEADZONE_FRAC = 0.15; // fração do raio externo antes de registrar direção
export const TOUCH_JOYSTICK_BG_COLOR = "rgba(255, 255, 255, 0.14)";
export const TOUCH_JOYSTICK_BORDER_COLOR = "rgba(255, 255, 255, 0.4)";
export const TOUCH_JOYSTICK_KNOB_COLOR = "rgba(255, 255, 255, 0.55)";
// multiplicador sobre o raio visual pra facilitar agarrar o manípulo (área de toque
// um pouco maior que o círculo desenhado)
export const TOUCH_JOYSTICK_HIT_RADIUS_MULT = 1.3;

// --- Joystick de movimento (canto inferior esquerdo, fixo) ---
export const TOUCH_MOVE_JOYSTICK_RADIUS_FRAC = 0.12; // raio externo, fração de min(w,h)
export const TOUCH_MOVE_JOYSTICK_MARGIN_FRAC = 0.04; // da borda esquerda/inferior até o círculo
export const TOUCH_MOVE_CROUCH_THRESHOLD_FRAC = 0.5; // fração do raio: puxar pra baixo além disso agacha (nível, não toggle)
export const TOUCH_MOVE_FLICK_THRESHOLD_FRAC = 0.6; // fração do raio: acima disso conta como "levado pra cima" (flick)
export const TOUCH_MOVE_DOUBLE_FLICK_WINDOW = 0.35; // segundos entre os dois flicks pra contar como duplo-flick = pulo
export const TOUCH_MOVE_JUMP_PULSE = 0.15; // segundos que o pulo fica "pressionado" após o duplo-flick

// --- Joystick de mira (canto inferior direito, fixo) ---
export const TOUCH_AIM_JOYSTICK_RADIUS_FRAC = 0.12;
export const TOUCH_AIM_JOYSTICK_MARGIN_FRAC = 0.04;

// --- Botão de pulo dedicado (lado direito, acima do joystick de mira) ---
export const TOUCH_JUMP_BUTTON_SIZE_FRAC = 0.16; // grande, alvo de toque generoso
export const TOUCH_JUMP_BUTTON_GAP_FRAC = 0.03; // espaço entre o botão e o joystick de mira

// --- Controles de toque: modo de precisão (tap exato / lupa), estilo Terraria mobile ---
export const TOUCH_TAP_MAX_HOLD = 0.18; // segundos: toque solto antes disso é um tap instantâneo no tile exato
export const TOUCH_PRECISION_ACTIVATION_DELAY = 0.25; // segundos com a lupa aberta antes da ação começar a disparar
export const TOUCH_MAGNIFIER_RADIUS_FRAC = 0.09; // fração de min(innerWidth, innerHeight)
export const TOUCH_MAGNIFIER_OFFSET_Y_FRAC = 0.2; // deslocamento da lupa acima do dedo (~80px em telas típicas)
export const TOUCH_MAGNIFIER_ZOOM = 1.5;
export const TOUCH_MAGNIFIER_BORDER_COLOR = "rgba(255, 255, 255, 0.9)";
export const TOUCH_MAGNIFIER_CROSSHAIR_COLOR = "rgba(255, 70, 70, 0.9)";

// --- Controles de toque: fullscreen (canto superior direito, ao lado do menu) ---
export const TOUCH_FULLSCREEN_BUTTON_SIZE_FRAC = 0.08;
export const TOUCH_FULLSCREEN_BUTTON_GAP_FRAC = 0.015; // espaço entre o botão de fullscreen e o de menu

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

// --- Itens (ícones de ferramentas na hotbar; imagem em vez da miniatura de cor) ---
export const ITEM_ICON_PICKAXE_SRC = "/pickaxe.png";

// --- Save / Load ---
export const SAVE_KEY = "terra_save_v1";
export const SAVE_VERSION = 1;
export const SAVE_AUTOSAVE_INTERVAL = 30; // segundos entre auto-saves

// --- Menu de save (F1 no teclado, botão discreto no toque) ---
export const SAVE_MENU_OVERLAY_COLOR = "rgba(0, 0, 0, 0.55)";
export const SAVE_MENU_PANEL_BG = "rgba(30, 30, 34, 0.95)";
export const SAVE_MENU_PANEL_BORDER = "rgba(255, 255, 255, 0.3)";
export const SAVE_MENU_PANEL_WIDTH = 260;
export const SAVE_MENU_PANEL_PADDING = 20;
export const SAVE_MENU_BUTTON_HEIGHT = 40;
export const SAVE_MENU_BUTTON_GAP = 12;
export const SAVE_MENU_TITLE_FONT = "16px monospace";
export const SAVE_MENU_BUTTON_FONT = "13px monospace";
export const SAVE_MENU_BUTTON_BG = "rgba(255, 255, 255, 0.12)";
export const SAVE_MENU_BUTTON_BORDER = "rgba(255, 255, 255, 0.4)";
export const SAVE_MENU_TEXT_COLOR = "#ffffff";

// --- Controles de toque: botão discreto do menu de save (canto superior direito) ---
export const TOUCH_MENU_BUTTON_SIZE_FRAC = 0.08;
export const TOUCH_MENU_BUTTON_MARGIN_FRAC = 0.03;
