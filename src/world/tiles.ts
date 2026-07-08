import {
  CAVE_BG_COLOR,
  TILE_COLORS,
  TILE_HARDNESS,
  TILE_SHADE_VARIANTS,
  TILE_TOP_LIGHT_FACTOR,
} from "../config";

export enum TileType {
  AR = 0,
  GRAMA = 1,
  TERRA = 2,
  PEDRA = 3,
  AREIA = 4,
  MADEIRA = 5,
  MINERIO_COBRE = 6,
  MINERIO_FERRO = 7,
  MINERIO_OURO = 8,
  BEDROCK = 9,
}

export const TILE_COUNT = 10;

export interface TileProps {
  solido: boolean;
  cor: string; // cor base (AR não é desenhado)
  dureza: number; // golpes p/ quebrar; Infinity = indestrutível
}

export const TILE_PROPS: Readonly<Record<TileType, TileProps>> = {
  [TileType.AR]: { solido: false, cor: "", dureza: 0 },
  [TileType.GRAMA]: { solido: true, cor: TILE_COLORS.GRAMA, dureza: TILE_HARDNESS.GRAMA },
  [TileType.TERRA]: { solido: true, cor: TILE_COLORS.TERRA, dureza: TILE_HARDNESS.TERRA },
  [TileType.PEDRA]: { solido: true, cor: TILE_COLORS.PEDRA, dureza: TILE_HARDNESS.PEDRA },
  [TileType.AREIA]: { solido: true, cor: TILE_COLORS.AREIA, dureza: TILE_HARDNESS.AREIA },
  [TileType.MADEIRA]: { solido: true, cor: TILE_COLORS.MADEIRA, dureza: TILE_HARDNESS.MADEIRA },
  [TileType.MINERIO_COBRE]: { solido: true, cor: TILE_COLORS.MINERIO_COBRE, dureza: TILE_HARDNESS.MINERIO_COBRE },
  [TileType.MINERIO_FERRO]: { solido: true, cor: TILE_COLORS.MINERIO_FERRO, dureza: TILE_HARDNESS.MINERIO_FERRO },
  [TileType.MINERIO_OURO]: { solido: true, cor: TILE_COLORS.MINERIO_OURO, dureza: TILE_HARDNESS.MINERIO_OURO },
  [TileType.BEDROCK]: { solido: true, cor: TILE_COLORS.BEDROCK, dureza: TILE_HARDNESS.BEDROCK },
};

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((n & 0xff) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Paletas pré-computadas: variação de tom por posição e borda superior clara.
const variants: string[][] = [];
const topLight: string[] = [];
for (let id = 0; id < TILE_COUNT; id++) {
  const props = TILE_PROPS[id as TileType];
  if (props.cor === "") {
    variants.push([]);
    topLight.push("");
    continue;
  }
  variants.push(TILE_SHADE_VARIANTS.map((f) => shade(props.cor, f)));
  topLight.push(shade(props.cor, TILE_TOP_LIGHT_FACTOR));
}

export const TILE_VARIANTS: ReadonlyArray<readonly string[]> = variants;
export const TILE_TOP_LIGHT: readonly string[] = topLight;
export const CAVE_BG_VARIANTS: readonly string[] = TILE_SHADE_VARIANTS.map((f) => shade(CAVE_BG_COLOR, f));

// Hash determinístico por posição, usado p/ escolher a variação de tom.
export function tileHash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
