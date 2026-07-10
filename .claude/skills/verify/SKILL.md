---
name: verify
description: Verifica mudanças do jogo Terra rodando o app real no Chromium headless e capturando screenshots.
---

# Verificação do Terra

Superfície: GUI no navegador (Canvas). Verificar = subir o dev server, dirigir com Playwright e olhar screenshots.

## Receita

1. Dev server (background): `npx vite --port 5173 --strictPort`
2. Playwright: instalar `playwright-core` no scratchpad (NÃO no projeto) e lançar com
   `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` e `args: ["--no-sandbox"]`.
3. Dirigir por teclado: A/D ou setas movem o player, Espaço/W/Seta-cima pula
   (`page.keyboard.down/up("KeyA"|"KeyD"|"Space")`). A câmera segue o player com lerp.
4. Screenshots com `page.screenshot()` e ler as imagens para inspecionar.
5. FPS real: contar frames de `requestAnimationFrame` por 2s via `page.evaluate` (o HUD também mostra fps no canto).
6. Capturar `pageerror`/`console.error` — favicon.ico dá um 404 conhecido e inofensivo.

## Fluxos que valem dirigir

- Spawn (superfície, meio do mundo): player parado sobre a grama, câmera centrada.
- Andar (A/D segurado) e pular colinas (D + taps de Espaço): sem atravessar tile nem prender em quina.
- Pulo tap vs hold: screenshot ~280ms após o press — tap já aterrissou, hold está no ar (altura variável).
- Anti-jitter: parado, dois `page.screenshot()` com 1s de intervalo devem ser buffers idênticos (`buf1.equals(buf2)`).
- Spam de pulo+direção alternando A/D contra o terreno: estado final limpo, sem clipping.

## Gotchas

- Há um handle de debug em `window.__terra` ({player, world, camera, dayNight, inventory}) —
  use `page.evaluate` p/ ler estado real (tiles, inventário, `lighting.brightnessAt(tx, ty, skyFactor)`).
- Botão esquerdo minera com progresso (segurar ~dureza×0.35s); botão direito coloca o item
  selecionado. Cliques instantâneos de Playwright funcionam p/ colocar (latch no Input),
  mas minerar exige `mouse.down` + espera + `mouse.up`.

- Mundo é determinístico por `WORLD_SEED`: as mesmas capturas devem sair iguais entre execuções.
- Player usa `public/player_sheet.png` (4x2, célula 64x128) via `PLAYER_SHEET_SRC` em config.ts;
  se a imagem falhar ao carregar, cai automaticamente no desenho procedural antigo (fallback).
  Pra testar o fallback: aponte `PLAYER_SHEET_SRC` pra um arquivo inexistente, dê `page.reload()`
  (o Image é carregado uma vez a nível de módulo, HMR sozinho não reexecuta isso de forma confiável).
- Terreno tem degraus de no máximo 1 tile (`SURFACE_MAX_STEP`); o player NÃO tem auto step-up — subir degrau exige pulo.
- Constantes de física/câmera em `src/config.ts` (player anda a `PLAYER_MOVE_SPEED` px/s).
