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
    touch.ts             Controles de toque réplica do Terraria mobile (joystick de movimento no canto inferior esquerdo — fixo ou flutuante conforme Settings; eixo horizontal anda, segurar pra baixo agacha, duplo-flick pra cima pula —, botão de pulo dedicado à direita, joystick de mira FIXO no canto inferior direito, tap exato/lupa de precisão fora dos controles, botões discretos de menu e fullscreen); despacho por toque pelo controle em que começou (sem "roubar" toques); inerte em dispositivos sem tela de toque
    settings.ts          Preferências do jogador (joystick esquerdo fixo/flutuante, pulo automático on/off), persistidas junto do save
    renderer.ts        Setup do canvas, resize, clear, contexto 2D
    particles.ts         Sistema de partículas (fragmentos de mineração, poeira de aterrissagem, fagulhas de tocha)
  world/
    gen.ts               Geração procedural do mundo (noise 1D, cavernas por CA, veios de minério)
    world.ts             Armazenamento do mundo em tiles + culling/cache de chunks visíveis
    chunk.ts            Chunk 32x32 com canvas offscreen cacheado (redesenha só quando sujo); inclui textura procedural por tile (specks, rachaduras, brilho de minério, tufos de grama)
    tiles.ts              Enum de tiles + tabela de propriedades (sólido, cor, dureza) + paletas
    light.ts              Iluminação por tile (níveis 0-15, BFS céu/tochas, relight incremental, overlay suave)
    daynight.ts        Ciclo dia/noite (relógio, cor do céu por keyframes, estrelas procedurais)
    torches.ts          Desenho dinâmico das tochas (chama com flicker procedural) + fagulhas
    sparkle.ts           Cintilância lenta e dinâmica dos tiles de minério de ouro visíveis
    parallax.ts          Background com camadas de colinas distantes e nuvens procedurais, com parallax e ciclo dia/noite
    save.ts                Serialização do save (delta de tiles vs. mundo gerado pela seed, inventário, posição, ciclo dia/noite) + localStorage
  player/
    player.ts            Estado do jogador + desenho procedural
    physics.ts           Física de plataforma (gravidade, aceleração/fricção, pulo variável, coyote time, colisão AABB por eixo, pulo automático em degraus de exatamente 1 tile)
    inventory.ts          Inventário simples (9 slots): blocos/tochas empilham até 999, ferramentas (picareta) ocupam um slot e não empilham/consomem
    interact.ts             Mira do mouse, ação por item selecionado (picareta só minera, bloco/tocha só constrói), mineração (progresso por dureza + rachaduras) e construção
  ui/
    hud.ts                Interface (fps, barra de vida, hotbar de 9 slots com ícone de imagem p/ ferramentas)
    savemenu.ts          Mini-menu de save (F1 / botão de toque): novo mundo (nova seed), apagar save, e seção "Controles" (joystick esquerdo fixo/flutuante, pulo automático)
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
- [x] Fase 5 — UI/HUD (vida, inventário, hotbar) — barra de vida com HP atual/máximo, hotbar de 9 slots
- [x] Fase 6 — Gameplay (mineração, construção, itens) — mira por alcance, mineração com rachaduras em 3 estágios, construção em tile de ar adjacente a sólido sem sobrepor o player, inventário simples integrado à hotbar
- [x] Fase 7 — Iluminação (luz por tile 0-15 via BFS em dois canais céu/blocos, relight incremental por caixa, tocha colocável com chama em flicker, overlay de escuridão suavizado, ciclo dia/noite de 10 min com crepúsculo e estrelas procedurais)
- [x] Fase 8 — Polimento visual (textura procedural por tile determinística por hash: specks/pedrinhas na terra, rachaduras na pedra, brilho fixo + cintilância lenta no ouro, tufos de grama; background parallax com 3 camadas de colinas e nuvens procedurais, escurecendo à noite; partículas de fragmentos ao minerar, poeira ao aterrissar de queda alta e fagulhas subindo das tochas)
- [x] Fase 9 — Controles de toque (mobile) — botões de movimento/pulo/agachar (agachar em toggle) ancorados acima da hotbar, joystick flutuante de mira no lado direito que substitui o mouse (mineração/construção contínuas por raycast na direção apontada), hotbar selecionável por toque, multi-touch, touch-action none; tudo inerte em dispositivos sem tela de toque
- [x] Fase 10 — Picareta como item + save/load — picareta é um item de ferramenta (`ToolType.PICARETA`, não empilhável/consumível/colocável) com ícone de imagem (`public/pickaxe.png`) no slot 1 da hotbar; a ação (clique/joystick) é determinada pelo item selecionado — picareta só minera, bloco/tocha só constrói, slot vazio/sem ação não faz nada, e sem picareta selecionada os tiles não recebem dano de mineração; o highlight do tile mirado muda de cor por modo (quebra/construção/neutro). Save/load em `localStorage`: delta de tiles vs. o mundo gerado pela seed (regenerável), inventário completo, posição do player e hora do ciclo dia/noite; auto-save a cada 30s e no `beforeunload`, carregado automaticamente ao abrir se houver save válido; save corrompido ou de versão antiga é descartado sem travar (gera o mundo padrão). Menu F1 (teclado) / botão discreto no canto (toque) com "Novo mundo" (nova seed, apaga o save) e "Apagar save".
- [x] Fase 11 — Mobile redesenhado — D-pad em cruz (◀/▶ nas pontas, ▲ pulo acima e ▼ agachar abaixo, entre os dois), botões ~3x maiores (alvo ≥15% da altura da tela), bem transparentes em repouso e mais opacos pressionados; botão discreto de fullscreen (Fullscreen API no gesto de toque) ao lado do menu, `public/manifest.json` PWA (`display: fullscreen`, `orientation: landscape`) linkado no `index.html`; modo de precisão na zona esquerda/central (fora do D-pad e da zona de mira): tap rápido age no tile exato do toque conforme o item selecionado, e tocar-e-segurar abre uma lupa (área sob o dedo ampliada 1.5x, deslocada acima dele, com crosshair) cujo alvo acompanha o arrasto e cuja ação dispara após um pequeno atraso e continua enquanto segurar; o joystick de mira da direita continua funcionando lado a lado, cada zona/toque com um único papel (sem disparo simultâneo entre tap, joystick e botões).
- [x] Fase 12 — Mobile réplica do Terraria (dois joysticks fixos) — D-pad removido; joystick de movimento FIXO no canto inferior esquerdo (eixo horizontal anda; segurar pra baixo agacha em nível, não toggle; duplo-flick pra cima — levar o manípulo além do limiar duas vezes em <350ms — dispara um pulo); botão de pulo dedicado grande e transparente no lado direito, acima do joystick de mira, acessível por qualquer mão; joystick de mira também FIXO, no canto inferior direito. Corrigido o bug em que qualquer toque na metade direita da tela era roubado pelo joystick de mira: agora o despacho é por captura geométrica exata (círculo/retângulo de cada controle) — um toque só pertence a um joystick/botão se **começar** dentro da sua área, senão é sempre interação com o mundo (tap exato/lupa de precisão), mesmo estando visualmente do lado direito. Multi-touch pleno testado: mover, pular e minerar/construir simultaneamente, cada dedo com seu próprio papel até soltar.
- [x] Fase 13 — Preferências de controle + correções — `Settings` (`src/engine/settings.ts`) guarda joystick esquerdo fixo/flutuante e pulo automático on/off, persistidos junto do save (`localStorage`) e editáveis numa seção "Controles" no mini-menu (toggles que alternam o valor e salvam na hora, sem fechar o menu). Joystick esquerdo: modo flutuante (padrão) nasce onde o dedo toca a metade esquerda da tela e some ao soltar (como o de mira fazia antes); modo fixo mantém posição pré-definida 30% maior e deslocada ~15% da largura à direita e ~15% da altura pra cima em relação à base; o joystick de mira (direita) permanece sempre fixo. Corrigido bug da lupa de precisão: o conteúdo ampliado e o crosshair agora são sempre recalculados a partir da câmera atual e centrados exatamente no tile sob o dedo (a janela visual continua deslocada acima do dedo, seguindo-o 1:1, mas o alvo nunca mais "desalinha", inclusive com a câmera se movendo sob um dedo parado). Pulo automático (`physics.ts`, liga por padrão): andando no chão contra um degrau de exatamente 1 tile com espaço livre acima, o player sobe sozinho com um pulinho mínimo isento do corte de altura variável (que é só pro pulo manual); degraus de 2+ tiles nunca disparam, e nunca dispara no ar ou agachado.

> Atualize esta seção ao final de cada fase concluída, marcando o item correspondente.
