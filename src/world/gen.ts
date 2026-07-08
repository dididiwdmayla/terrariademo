import {
  CAVE_AIR_CHANCE_BOTTOM,
  CAVE_AIR_CHANCE_TOP,
  CAVE_SMOOTH_PASSES,
  CAVE_TOP_MARGIN,
  CAVE_WALL_THRESHOLD,
  DIRT_DEPTH_MAX,
  DIRT_DEPTH_MIN,
  DIRT_WAVELENGTH,
  ORE_COBRE,
  ORE_FERRO,
  ORE_OURO,
  SURFACE_AMPLITUDE,
  SURFACE_BASE_Y,
  SURFACE_MAX_Y,
  SURFACE_MIN_Y,
  SURFACE_OCTAVES,
  SURFACE_PERSISTENCE,
  SURFACE_WAVELENGTH,
  type OreVeinConfig,
} from "../config";
import { TileType } from "./tiles";
import type { World } from "./world";

// ---------------------------------------------------------------------------
// PRNG e ruído determinísticos (implementados do zero, sem libs)
// ---------------------------------------------------------------------------

// PRNG mulberry32: sequência reprodutível a partir de uma seed inteira.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash inteiro -> [0, 1), estável por (posição, seed).
function hash01(ix: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(seed, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Value noise 1D: valores aleatórios em pontos inteiros, interpolados com smoothstep.
function valueNoise1D(x: number, seed: number): number {
  const ix = Math.floor(x);
  const fx = x - ix;
  const a = hash01(ix, seed);
  const b = hash01(ix + 1, seed);
  const t = fx * fx * (3 - 2 * fx);
  return a + (b - a) * t;
}

// Soma de octaves de value noise; retorna [0, 1).
function octaveNoise1D(x: number, seed: number, octaves: number, persistence: number): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise1D(x * frequency, seed + o * 101) * amplitude;
    norm += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// Etapas de geração
// ---------------------------------------------------------------------------

// 1. Superfície: colinas suaves; grama no topo, 4-8 de terra, pedra abaixo.
//    Retorna o y da primeira linha de pedra por coluna.
function gerarSuperficie(world: World, seed: number): Int16Array {
  const w = world.widthTiles;
  const h = world.heightTiles;
  const tiles = world.tiles;
  const stoneTop = new Int16Array(w);

  for (let x = 0; x < w; x++) {
    const n = octaveNoise1D(x / SURFACE_WAVELENGTH, seed, SURFACE_OCTAVES, SURFACE_PERSISTENCE);
    let surfY = Math.round(SURFACE_BASE_Y + (n - 0.5) * 2 * SURFACE_AMPLITUDE);
    surfY = Math.min(SURFACE_MAX_Y, Math.max(SURFACE_MIN_Y, surfY));

    const dirtN = octaveNoise1D(x / DIRT_WAVELENGTH, seed + 7777, 2, 0.5);
    const dirtRange = DIRT_DEPTH_MAX - DIRT_DEPTH_MIN;
    const dirt = DIRT_DEPTH_MIN + Math.min(dirtRange, Math.floor(dirtN * (dirtRange + 1)));

    world.surfaceHeight[x] = surfY;
    stoneTop[x] = surfY + dirt + 1;

    tiles[surfY * w + x] = TileType.GRAMA;
    for (let y = surfY + 1; y <= surfY + dirt; y++) tiles[y * w + x] = TileType.TERRA;
    for (let y = surfY + dirt + 1; y < h; y++) tiles[y * w + x] = TileType.PEDRA;
  }
  return stoneTop;
}

// 2. Cavernas: cellular automata na camada de pedra. Semeia ar com chance
//    crescente com a profundidade e suaviza por maioria de vizinhos 3x3.
function escavarCavernas(world: World, stoneTop: Int16Array, seed: number): void {
  const w = world.widthTiles;
  const h = world.heightTiles;
  const rand = mulberry32(seed ^ 0x5deece66);
  const bottom = h - 2; // preserva a linha do bedrock
  const caveTop = new Int16Array(w);
  for (let x = 0; x < w; x++) caveTop[x] = stoneTop[x] + CAVE_TOP_MARGIN;

  let grid = new Uint8Array(w * h); // 1 = aberto, 0 = parede
  let next = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < caveTop[x] || y > bottom) continue;
      const depth = (y - caveTop[x]) / Math.max(1, bottom - caveTop[x]);
      const airChance = CAVE_AIR_CHANCE_TOP + (CAVE_AIR_CHANCE_BOTTOM - CAVE_AIR_CHANCE_TOP) * depth;
      grid[y * w + x] = rand() < airChance ? 1 : 0;
    }
  }

  // célula vira parede com >= CAVE_WALL_THRESHOLD paredes na janela 3x3
  // (equivalente: continua aberta com >= 10 - threshold células abertas)
  const openLimit = 10 - CAVE_WALL_THRESHOLD;
  for (let pass = 0; pass < CAVE_SMOOTH_PASSES; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (y < caveTop[x] || y > bottom) {
          next[i] = 0;
          continue;
        }
        let open = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          const rowBase = ny * w;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            open += grid[rowBase + nx];
          }
        }
        next[i] = open >= openLimit ? 1 : 0;
      }
    }
    [grid, next] = [next, grid];
  }

  const tiles = world.tiles;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (grid[i] === 1 && tiles[i] === TileType.PEDRA) tiles[i] = TileType.AR;
    }
  }
}

// 3. Minérios: veios por random walk, substituindo apenas pedra.
function gerarMinerios(world: World, stoneTop: Int16Array, seed: number): void {
  const w = world.widthTiles;
  const h = world.heightTiles;
  const tiles = world.tiles;
  const rand = mulberry32(seed ^ 0x2545f491);

  const cavarVeios = (tipo: TileType, cfg: OreVeinConfig): void => {
    for (let i = 0; i < cfg.veins; i++) {
      const startX = 1 + Math.floor(rand() * (w - 2));
      const top = stoneTop[startX] + 1;
      const bottom = h - 2;
      if (bottom <= top) continue;

      const depth = cfg.minDepth + rand() * (cfg.maxDepth - cfg.minDepth);
      let cx = startX;
      let cy = Math.min(bottom, Math.max(top, Math.round(top + depth * (bottom - top))));
      const len = cfg.minLen + Math.floor(rand() * (cfg.maxLen - cfg.minLen + 1));

      for (let step = 0; step < len; step++) {
        const idx = cy * w + cx;
        if (tiles[idx] === TileType.PEDRA) tiles[idx] = tipo;
        if (rand() < cfg.branchChance) {
          const nx = cx + (rand() < 0.5 ? 1 : -1);
          if (nx > 0 && nx < w - 1 && tiles[cy * w + nx] === TileType.PEDRA) tiles[cy * w + nx] = tipo;
        }
        const dir = Math.floor(rand() * 4);
        if (dir === 0) cx++;
        else if (dir === 1) cx--;
        else if (dir === 2) cy++;
        else cy--;
        cx = Math.min(w - 2, Math.max(1, cx));
        cy = Math.min(bottom, Math.max(top, cy));
      }
    }
  };

  cavarVeios(TileType.MINERIO_COBRE, ORE_COBRE); // comum e raso
  cavarVeios(TileType.MINERIO_FERRO, ORE_FERRO); // médio
  cavarVeios(TileType.MINERIO_OURO, ORE_OURO); // raro e profundo
}

// ---------------------------------------------------------------------------

export function generateWorld(world: World, seed: number): void {
  const stoneTop = gerarSuperficie(world, seed);
  escavarCavernas(world, stoneTop, seed);
  gerarMinerios(world, stoneTop, seed);

  // 4. última linha do mundo: bedrock indestrutível
  const w = world.widthTiles;
  const lastRow = (world.heightTiles - 1) * w;
  for (let x = 0; x < w; x++) world.tiles[lastRow + x] = TileType.BEDROCK;

  world.markAllDirty();
}
