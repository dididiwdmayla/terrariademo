import {
  CHUNK_SIZE_TILES,
  CORNER_CHAMFER_MAX,
  CORNER_CHAMFER_MIN,
  DIRT_SPECK_COUNT,
  DIRT_SPECK_DARK_FACTOR,
  DIRT_SPECK_LIGHT_FACTOR,
  DIRT_SPECK_SIZE,
  EDGE_RECESS_MAX,
  EDGE_RECESS_MIN,
  EDGE_SEGMENT_PX,
  GRASS_DRIP_LEN_MAX,
  GRASS_DRIP_LEN_MIN,
  GRASS_DRIP_WIDTH,
  GRASS_TUFT_COLOR_DARK,
  GRASS_TUFT_COLOR_LIGHT,
  GRASS_TUFT_COUNT,
  GRASS_TUFT_HEIGHT_MAX,
  GRASS_TUFT_HEIGHT_MIN,
  GRASS_TUFT_WIDTH,
  GROUP_TOOTH_DEPTH_MAX,
  GROUP_TOOTH_DEPTH_MIN,
  INNER_FILLET_PX,
  ORE_SHINE_COUNT,
  ORE_SHINE_FACTOR,
  ORE_SHINE_SIZE,
  STONE_CRACK_COUNT,
  STONE_CRACK_FACTOR,
  STONE_CRACK_LEN_MAX,
  STONE_CRACK_LEN_MIN,
  TILE_SIZE,
  TILE_SHADE_VARIANTS,
  TILE_TOP_LIGHT_PX,
} from "../config";
import {
  CAVE_BG_VARIANTS,
  TILE_GROUP,
  TILE_PROPS,
  TILE_TOP_LIGHT,
  TILE_VARIANTS,
  TileType,
  shade,
  tileHash,
} from "./tiles";
import type { World } from "./world";

// LCG simples semeado pelo hash de posição p/ gerar sub-valores determinísticos.
function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export const CHUNK_PX = CHUNK_SIZE_TILES * TILE_SIZE;

const nVariants = TILE_SHADE_VARIANTS.length;
const SEGS = Math.max(1, Math.round(TILE_SIZE / EDGE_SEGMENT_PX)); // segmentos por aresta

// Bits do bitmask de vizinhança (8 direções, ligado = vizinho sólido).
const N = 1;
const S = 2;
const W = 4;
const E = 8;
const NW = 16;
const NE = 32;
const SW = 64;
const SE = 128;

// Lados de um tile: 0=topo, 1=fundo, 2=esquerda, 3=direita.

// Perfil de recuo da aresta erodida, por segmento. A chave do hash usa
// coordenadas de segmento no mundo, então o perfil é determinístico e contínuo
// entre tiles vizinhos que dividem a mesma linha de aresta. Nos cantos
// côncavos o recuo cai ao mínimo p/ emendar no preenchimento côncavo que o
// tile de ar desenha do outro lado.
function sideRecess(wx: number, wy: number, side: number, concaveStart: boolean, concaveEnd: boolean): number[] {
  const range = EDGE_RECESS_MAX - EDGE_RECESS_MIN + 1;
  const horizontal = side < 2;
  const cross = (horizontal ? wy : wx) * 4 + side;
  const out = new Array<number>(SEGS);
  for (let i = 0; i < SEGS; i++) {
    const along = (horizontal ? wx : wy) * SEGS + i;
    out[i] = EDGE_RECESS_MIN + (tileHash(along, cross) % range);
  }
  if (concaveStart) out[0] = EDGE_RECESS_MIN;
  if (concaveEnd) out[SEGS - 1] = EDGE_RECESS_MIN;
  return out;
}

// Fundo que aparece atrás de um recuo esculpido, dado o tile de ar que a
// aresta encara: null = apagar (o céu/parallax atrás do canvas do chunk
// aparece); string = cor do fundo de caverna, casando com o que esse tile de
// ar desenha.
function carveStyle(world: World, nx: number, ny: number): string | null {
  return ny > world.surfaceHeight[nx] ? CAVE_BG_VARIANTS[tileHash(nx, ny) % nVariants] : null;
}

// Um chunk mantém um canvas offscreen com seus tiles já desenhados em
// resolução nativa; o mundo só redesenha quando o chunk fica sujo. Como o
// desenho de cada tile depende só de posição + vizinhança (determinístico),
// esse cache também cobre o custo do autotiling.
export class Chunk {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  dirty = true;
  lastUsed = 0;

  constructor(
    readonly chunkX: number,
    readonly chunkY: number,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CHUNK_PX;
    this.canvas.height = CHUNK_PX;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context não disponível para chunk");
    this.ctx = ctx;
  }

  redraw(world: World): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CHUNK_PX, CHUNK_PX);
    const baseX = this.chunkX * CHUNK_SIZE_TILES;
    const baseY = this.chunkY * CHUNK_SIZE_TILES;

    for (let ty = 0; ty < CHUNK_SIZE_TILES; ty++) {
      const wy = baseY + ty;
      if (wy >= world.heightTiles) break;
      const py = ty * TILE_SIZE;
      for (let tx = 0; tx < CHUNK_SIZE_TILES; tx++) {
        const wx = baseX + tx;
        if (wx >= world.widthTiles) break;
        const px = tx * TILE_SIZE;
        const tile = world.getTile(wx, wy);

        if (tile === TileType.AR || tile === TileType.TOCHA) {
          // ar acima da superfície fica transparente (céu); abaixo, fundo de
          // caverna. A tocha é desenhada dinamicamente (flicker) fora do cache.
          if (wy > world.surfaceHeight[wx]) {
            ctx.fillStyle = CAVE_BG_VARIANTS[tileHash(wx, wy) % nVariants];
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
          this.drawInnerFillets(ctx, world, wx, wy, px, py);
          continue;
        }

        this.drawSolidTile(ctx, world, tile, wx, wy, px, py);
      }
    }
    this.dirty = false;
  }

  // Tile sólido com autotiling: corpo + textura, dentes na transição entre
  // grupos e arestas expostas ao ar esculpidas (recuo irregular por segmento,
  // chanfro nos cantos externos), com a borda clara e os detalhes de grama
  // seguindo o perfil erodido.
  private drawSolidTile(
    ctx: CanvasRenderingContext2D,
    world: World,
    tile: TileType,
    wx: number,
    wy: number,
    px: number,
    py: number,
  ): void {
    const group = TILE_GROUP[tile];
    const nN = world.getTile(wx, wy - 1);
    const nS = world.getTile(wx, wy + 1);
    const nW = world.getTile(wx - 1, wy);
    const nE = world.getTile(wx + 1, wy);

    // bitmask dos 8 vizinhos sólidos
    let mask = 0;
    if (TILE_PROPS[nN].solido) mask |= N;
    if (TILE_PROPS[nS].solido) mask |= S;
    if (TILE_PROPS[nW].solido) mask |= W;
    if (TILE_PROPS[nE].solido) mask |= E;
    if (TILE_PROPS[world.getTile(wx - 1, wy - 1)].solido) mask |= NW;
    if (TILE_PROPS[world.getTile(wx + 1, wy - 1)].solido) mask |= NE;
    if (TILE_PROPS[world.getTile(wx - 1, wy + 1)].solido) mask |= SW;
    if (TILE_PROPS[world.getTile(wx + 1, wy + 1)].solido) mask |= SE;

    ctx.fillStyle = TILE_VARIANTS[tile][tileHash(wx, wy) % nVariants];
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    this.drawTexture(ctx, tile, wx, wy, px, py);

    // dentes irregulares interpenetrando a aresta com um grupo diferente
    // (terra↔pedra, pedra↔areia etc.), no lugar de uma linha reta
    if (mask & N && TILE_GROUP[nN] !== group) this.drawGroupTeeth(ctx, 0, wx, wy, px, py, nN);
    if (mask & S && TILE_GROUP[nS] !== group) this.drawGroupTeeth(ctx, 1, wx, wy, px, py, nS);
    if (mask & W && TILE_GROUP[nW] !== group) this.drawGroupTeeth(ctx, 2, wx, wy, px, py, nW);
    if (mask & E && TILE_GROUP[nE] !== group) this.drawGroupTeeth(ctx, 3, wx, wy, px, py, nE);

    // perfis de erosão das arestas expostas ao ar
    const topR = mask & N ? null : sideRecess(wx, wy, 0, !!(mask & W && mask & NW), !!(mask & E && mask & NE));
    const botR = mask & S ? null : sideRecess(wx, wy, 1, !!(mask & W && mask & SW), !!(mask & E && mask & SE));
    const leftR = mask & W ? null : sideRecess(wx, wy, 2, !!(mask & N && mask & NW), !!(mask & S && mask & SW));
    const rightR = mask & E ? null : sideRecess(wx, wy, 3, !!(mask & N && mask & NE), !!(mask & S && mask & SE));

    if (topR) {
      this.withCarve(ctx, carveStyle(world, wx, wy - 1), () => {
        for (let i = 0; i < SEGS; i++) ctx.fillRect(px + i * EDGE_SEGMENT_PX, py, EDGE_SEGMENT_PX, topR[i]);
      });
    }
    if (botR) {
      this.withCarve(ctx, carveStyle(world, wx, wy + 1), () => {
        for (let i = 0; i < SEGS; i++)
          ctx.fillRect(px + i * EDGE_SEGMENT_PX, py + TILE_SIZE - botR[i], EDGE_SEGMENT_PX, botR[i]);
      });
    }
    if (leftR) {
      this.withCarve(ctx, carveStyle(world, wx - 1, wy), () => {
        for (let i = 0; i < SEGS; i++) ctx.fillRect(px, py + i * EDGE_SEGMENT_PX, leftR[i], EDGE_SEGMENT_PX);
      });
    }
    if (rightR) {
      this.withCarve(ctx, carveStyle(world, wx + 1, wy), () => {
        for (let i = 0; i < SEGS; i++)
          ctx.fillRect(px + TILE_SIZE - rightR[i], py + i * EDGE_SEGMENT_PX, rightR[i], EDGE_SEGMENT_PX);
      });
    }

    // canto externo (dois lados adjacentes expostos): chanfro de 3-4px
    const chamferRange = CORNER_CHAMFER_MAX - CORNER_CHAMFER_MIN + 1;
    const chamfer = (corner: number): number =>
      CORNER_CHAMFER_MIN + (tileHash(wx * 4 + corner, wy) % chamferRange);
    let cTL = 0;
    let cTR = 0;
    if (topR && leftR) {
      cTL = chamfer(0);
      this.carveCorner(ctx, world, wx, wy, px, py, -1, -1, cTL);
    }
    if (topR && rightR) {
      cTR = chamfer(1);
      this.carveCorner(ctx, world, wx, wy, px + TILE_SIZE, py, 1, -1, cTR);
    }
    if (botR && leftR) this.carveCorner(ctx, world, wx, wy, px, py + TILE_SIZE, -1, 1, chamfer(2));
    if (botR && rightR) this.carveCorner(ctx, world, wx, wy, px + TILE_SIZE, py + TILE_SIZE, 1, 1, chamfer(3));

    // borda superior mais clara segue o perfil erodido (fora dos chanfros)
    if (topR) {
      ctx.fillStyle = TILE_TOP_LIGHT[tile];
      for (let i = 0; i < SEGS; i++) {
        const x0 = Math.max(px + i * EDGE_SEGMENT_PX, px + cTL);
        const x1 = Math.min(px + (i + 1) * EDGE_SEGMENT_PX, px + TILE_SIZE - cTR);
        if (x1 > x0) ctx.fillRect(x0, py + topR[i], x1 - x0, TILE_TOP_LIGHT_PX);
      }
    }

    // grama escorrendo pela lateral exposta do tile abaixo dela
    if (nN === TileType.GRAMA) {
      if (leftR) this.drawGrassDrip(ctx, wx, wy, px, py, 2, leftR[0]);
      if (rightR) this.drawGrassDrip(ctx, wx, wy, px, py, 3, rightR[0]);
    }

    if (tile === TileType.GRAMA && topR) this.drawGrassTufts(ctx, wx, wy, px, py, topR, cTL, cTR);
  }

  // Esculpe formas na aresta exposta: apaga (céu aparece por trás do canvas)
  // ou pinta o fundo de caverna, conforme o ar que a aresta encara.
  private withCarve(ctx: CanvasRenderingContext2D, style: string | null, draw: () => void): void {
    if (style === null) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      draw();
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = style;
      draw();
    }
  }

  // Chanfro triangular do canto externo em (x0, y0); dx/dy apontam p/ fora do tile.
  private carveCorner(
    ctx: CanvasRenderingContext2D,
    world: World,
    wx: number,
    wy: number,
    x0: number,
    y0: number,
    dx: number,
    dy: number,
    c: number,
  ): void {
    const diagAir = !TILE_PROPS[world.getTile(wx + dx, wy + dy)].solido;
    const style = diagAir ? carveStyle(world, wx + dx, wy + dy) : carveStyle(world, wx, wy + dy);
    this.withCarve(ctx, style, () => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - dx * c, y0);
      ctx.lineTo(x0, y0 - dy * c);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Canto interno visto do tile de ar: diagonal sólida com os dois ortogonais
  // sólidos — preenche um pequeno côncavo no canto p/ suavizar o encontro.
  private drawInnerFillets(
    ctx: CanvasRenderingContext2D,
    world: World,
    wx: number,
    wy: number,
    px: number,
    py: number,
  ): void {
    for (let cy = -1; cy <= 1; cy += 2) {
      for (let cx = -1; cx <= 1; cx += 2) {
        const diag = world.getTile(wx + cx, wy + cy);
        if (!TILE_PROPS[diag].solido) continue;
        if (!TILE_PROPS[world.getTile(wx + cx, wy)].solido) continue;
        if (!TILE_PROPS[world.getTile(wx, wy + cy)].solido) continue;
        const x0 = cx < 0 ? px : px + TILE_SIZE;
        const y0 = cy < 0 ? py : py + TILE_SIZE;
        ctx.fillStyle = TILE_VARIANTS[diag][tileHash(wx + cx, wy + cy) % nVariants];
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 - cx * INNER_FILLET_PX, y0);
        ctx.lineTo(x0, y0 - cy * INNER_FILLET_PX);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Dentes de 1-2px interpenetrando a aresta entre grupos diferentes. A chave
  // do hash é da própria linha da aresta (os dois tiles calculam o mesmo
  // valor): cada segmento tem exatamente um dente, invadindo um dos lados,
  // então os passes dos dois vizinhos se encaixam sem sobra reta.
  private drawGroupTeeth(
    ctx: CanvasRenderingContext2D,
    side: number,
    wx: number,
    wy: number,
    px: number,
    py: number,
    nTile: TileType,
  ): void {
    const horizontal = side < 2;
    const nx = side === 2 ? wx - 1 : side === 3 ? wx + 1 : wx;
    const ny = side === 0 ? wy - 1 : side === 1 ? wy + 1 : wy;
    ctx.fillStyle = TILE_VARIANTS[nTile][tileHash(nx, ny) % nVariants];
    const range = GROUP_TOOTH_DEPTH_MAX - GROUP_TOOTH_DEPTH_MIN + 1;
    const boundary = horizontal ? (side === 0 ? wy : wy + 1) : (side === 2 ? wx : wx + 1);
    // o lado "positivo" da aresta (sul/leste) recebe o dente quando o bit 0 liga
    const positive = side === 0 || side === 2;
    for (let i = 0; i < SEGS; i++) {
      const along = (horizontal ? wx : wy) * SEGS + i;
      const h = tileHash(along, boundary * 2 + (horizontal ? 0 : 1));
      if (((h & 1) === 1) !== positive) continue;
      const depth = GROUP_TOOTH_DEPTH_MIN + ((h >>> 1) % range);
      if (horizontal) {
        ctx.fillRect(px + i * EDGE_SEGMENT_PX, side === 0 ? py : py + TILE_SIZE - depth, EDGE_SEGMENT_PX, depth);
      } else {
        ctx.fillRect(side === 2 ? px : px + TILE_SIZE - depth, py + i * EDGE_SEGMENT_PX, depth, EDGE_SEGMENT_PX);
      }
    }
  }

  // Camada verde da grama de cima escorrendo 2-4px pela lateral exposta,
  // rente à aresta erodida, com uma gota final de 1px.
  private drawGrassDrip(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    px: number,
    py: number,
    side: number,
    recess: number,
  ): void {
    const h = tileHash(wx * 4 + side, wy ^ 0x51f15eed);
    const len = GRASS_DRIP_LEN_MIN + (h % (GRASS_DRIP_LEN_MAX - GRASS_DRIP_LEN_MIN + 1));
    ctx.fillStyle = TILE_VARIANTS[TileType.GRAMA][tileHash(wx, wy - 1) % nVariants];
    const x = side === 2 ? px + recess : px + TILE_SIZE - recess - GRASS_DRIP_WIDTH;
    ctx.fillRect(x, py, GRASS_DRIP_WIDTH, len);
    ctx.fillRect(x + ((h >>> 3) & 1) * (GRASS_DRIP_WIDTH - 1), py + len, 1, 1 + ((h >>> 4) & 1));
  }

  // Tufos de grama ancorados no perfil erodido do topo (pulando os chanfros).
  private drawGrassTufts(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    px: number,
    py: number,
    topR: number[],
    cTL: number,
    cTR: number,
  ): void {
    const rng = rngFrom(tileHash(wx, wy) ^ 0x9e3779b9);
    for (let i = 0; i < GRASS_TUFT_COUNT; i++) {
      const tuftH = GRASS_TUFT_HEIGHT_MIN + rng() * (GRASS_TUFT_HEIGHT_MAX - GRASS_TUFT_HEIGHT_MIN);
      const tx = px + rng() * (TILE_SIZE - GRASS_TUFT_WIDTH);
      const lean = (rng() - 0.5) * 3;
      const light = rng() < 0.5;
      if (tx < px + cTL || tx + GRASS_TUFT_WIDTH > px + TILE_SIZE - cTR) continue;
      const seg = Math.min(SEGS - 1, Math.floor((tx - px) / EDGE_SEGMENT_PX));
      const baseY = py + topR[seg];
      ctx.fillStyle = light ? GRASS_TUFT_COLOR_LIGHT : GRASS_TUFT_COLOR_DARK;
      ctx.beginPath();
      ctx.moveTo(tx, baseY);
      ctx.lineTo(tx + GRASS_TUFT_WIDTH, baseY);
      ctx.lineTo(tx + GRASS_TUFT_WIDTH / 2 + lean, baseY - tuftH);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Textura procedural por tipo de tile, determinística por hash de posição
  // (mesmo tile sempre parece igual, independente de quantas vezes é redesenhado).
  private drawTexture(
    ctx: CanvasRenderingContext2D,
    tile: TileType,
    wx: number,
    wy: number,
    px: number,
    py: number,
  ): void {
    const rng = rngFrom(tileHash(wx, wy) ^ 0x9e3779b9);

    switch (tile) {
      case TileType.TERRA: {
        const baseColor = TILE_PROPS[tile].cor;
        for (let i = 0; i < DIRT_SPECK_COUNT; i++) {
          const sx = px + Math.floor(rng() * (TILE_SIZE - DIRT_SPECK_SIZE));
          const sy = py + Math.floor(rng() * (TILE_SIZE - DIRT_SPECK_SIZE));
          ctx.fillStyle = shade(baseColor, rng() < 0.5 ? DIRT_SPECK_DARK_FACTOR : DIRT_SPECK_LIGHT_FACTOR);
          ctx.fillRect(sx, sy, DIRT_SPECK_SIZE, DIRT_SPECK_SIZE);
        }
        break;
      }
      case TileType.PEDRA: {
        const baseColor = TILE_PROPS[tile].cor;
        ctx.strokeStyle = shade(baseColor, STONE_CRACK_FACTOR);
        ctx.lineWidth = 1;
        for (let i = 0; i < STONE_CRACK_COUNT; i++) {
          const len = STONE_CRACK_LEN_MIN + rng() * (STONE_CRACK_LEN_MAX - STONE_CRACK_LEN_MIN);
          const angle = rng() * Math.PI * 2;
          const cx = px + rng() * TILE_SIZE;
          const cy = py + rng() * TILE_SIZE;
          ctx.beginPath();
          ctx.moveTo(cx - (Math.cos(angle) * len) / 2, cy - (Math.sin(angle) * len) / 2);
          ctx.lineTo(cx + (Math.cos(angle) * len) / 2, cy + (Math.sin(angle) * len) / 2);
          ctx.stroke();
        }
        break;
      }
      case TileType.MINERIO_COBRE:
      case TileType.MINERIO_FERRO:
      case TileType.MINERIO_OURO: {
        const baseColor = TILE_PROPS[tile].cor;
        ctx.fillStyle = shade(baseColor, ORE_SHINE_FACTOR);
        for (let i = 0; i < ORE_SHINE_COUNT; i++) {
          const sx = px + Math.floor(rng() * (TILE_SIZE - ORE_SHINE_SIZE));
          const sy = py + Math.floor(rng() * (TILE_SIZE - ORE_SHINE_SIZE));
          ctx.fillRect(sx, sy, ORE_SHINE_SIZE, ORE_SHINE_SIZE);
        }
        // o cintilar lento do ouro é desenhado à parte, em cada frame (ver sparkle.ts).
        break;
      }
      default:
        break;
    }
  }
}
