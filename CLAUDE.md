# Terra

Jogo 2D estilo Terraria renderizado em Canvas 2D, construído em Vite + TypeScript vanilla (sem framework de UI e sem engine de jogo externa).

## Stack

- Vite (bundler/dev server)
- TypeScript (strict mode)
- Canvas 2D API pura (sem PixiJS, Phaser, etc.)

## Estrutura de pastas

```
src/
  main.ts            Bootstrap da aplicação e game loop (fixed timestep)
  config.ts           TODAS as constantes tunáveis do jogo
  engine/
    camera.ts          Câmera (posição, zoom, conversão world->screen)
    input.ts            Captura de teclado/mouse
    renderer.ts        Setup do canvas, resize, clear, contexto 2D
  world/
    gen.ts               Geração procedural do mundo (noise 1D, cavernas por CA, veios de minério)
    world.ts             Armazenamento do mundo em tiles + culling/cache de chunks visíveis
    chunk.ts            Chunk 32x32 com canvas offscreen cacheado (redesenha só quando sujo)
    tiles.ts              Enum de tiles + tabela de propriedades (sólido, cor, dureza) + paletas
  player/
    player.ts            Estado do jogador + desenho procedural
    physics.ts           Física de plataforma (gravidade, aceleração/fricção, pulo variável, coyote time, colisão AABB por eixo)
    inventory.ts          Inventário simples (9 slots, stack até 999)
    interact.ts             Mira do mouse, mineração (progresso por dureza + rachaduras) e construção
  ui/
    hud.ts                Interface (fps, hotbar de 9 slots; barra de vida ainda não implementada)
```

## Convenções

- **Constantes**: todo valor tunável (tamanho de tile, gravidade, velocidade, tamanho do mundo, cores, timestep, etc.) vive exclusivamente em `src/config.ts`. Nenhum número mágico espalhado pelo código.
- **Um sistema por arquivo**: cada arquivo tem uma responsabilidade única e bem definida (câmera, input, renderer, física, geração de mundo, etc.). Não misturar sistemas no mesmo módulo.
- **Sem libs externas de jogo**: nada de engines/frameworks de jogo (Phaser, PixiJS, Matter.js, etc.). Tudo é implementado manualmente sobre Canvas 2D puro.
- **Game loop**: fixed timestep com acumulador (`src/main.ts`), separando `update(dt)` de `render()`.
- **Pixel art crisp**: `imageSmoothingEnabled = false` sempre configurado no contexto do canvas.

## STATUS

- [x] Fase 1 — Setup do projeto (Vite + TS + estrutura de pastas + canvas fullscreen + game loop + retângulo de teste)
- [x] Fase 2 — Engine core (camera com clamp e movimento livre WASD/setas, input, renderer integrados)
- [x] Fase 3 — Geração de mundo (tiles com propriedades, chunks cacheados com culling, colinas por value noise 1D, cavernas por cellular automata, minérios por random walk, bedrock)
- [x] Fase 4 — Player (movimento com aceleração/fricção, gravidade, pulo variável com coyote time, colisão AABB por eixo, câmera com follow suavizado; terreno da superfície suavizado p/ degraus de 1 tile)
- [ ] Fase 5 — UI/HUD (vida, inventário, hotbar) — hotbar de 9 slots pronta; falta barra de vida e tela de inventário completa
- [x] Fase 6 — Gameplay (mineração, construção, itens) — mira por alcance, mineração com rachaduras em 3 estágios, construção em tile de ar adjacente a sólido sem sobrepor o player, inventário simples integrado à hotbar

> Atualize esta seção ao final de cada fase concluída, marcando o item correspondente.
