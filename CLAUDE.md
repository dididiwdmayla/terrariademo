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
    gen.ts               Geração procedural do mundo
    chunk.ts            Estrutura de chunk de tiles
    tiles.ts              Definições de tipos de tile
  player/
    player.ts            Estado do jogador
    physics.ts           Gravidade, movimento, colisão
  ui/
    hud.ts                Interface (barra de vida, inventário, etc.)
```

## Convenções

- **Constantes**: todo valor tunável (tamanho de tile, gravidade, velocidade, tamanho do mundo, cores, timestep, etc.) vive exclusivamente em `src/config.ts`. Nenhum número mágico espalhado pelo código.
- **Um sistema por arquivo**: cada arquivo tem uma responsabilidade única e bem definida (câmera, input, renderer, física, geração de mundo, etc.). Não misturar sistemas no mesmo módulo.
- **Sem libs externas de jogo**: nada de engines/frameworks de jogo (Phaser, PixiJS, Matter.js, etc.). Tudo é implementado manualmente sobre Canvas 2D puro.
- **Game loop**: fixed timestep com acumulador (`src/main.ts`), separando `update(dt)` de `render()`.
- **Pixel art crisp**: `imageSmoothingEnabled = false` sempre configurado no contexto do canvas.

## STATUS

- [ ] Fase 1 — Setup do projeto (Vite + TS + estrutura de pastas + canvas fullscreen + game loop + retângulo de teste)
- [ ] Fase 2 — Engine core (camera, input, renderer completos e integrados)
- [ ] Fase 3 — Geração de mundo (tiles, chunks, terreno procedural)
- [ ] Fase 4 — Player (movimento, física, colisão com o mundo)
- [ ] Fase 5 — UI/HUD (vida, inventário, hotbar)
- [ ] Fase 6 — Gameplay (mineração, construção, itens)

> Atualize esta seção ao final de cada fase concluída, marcando o item correspondente.
