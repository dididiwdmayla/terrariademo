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
3. Dirigir por teclado: `page.keyboard.down/up("KeyW"|"KeyA"|"KeyS"|"KeyD"|"ShiftLeft")`.
   Câmera livre anda a `CAMERA_PAN_SPEED` px/s (x3 com Shift) — ver `src/config.ts`.
4. Screenshots com `page.screenshot()` e ler as imagens para inspecionar.
5. FPS real: contar frames de `requestAnimationFrame` por 2s via `page.evaluate` (o HUD também mostra fps no canto).
6. Capturar `pageerror`/`console.error` — favicon.ico dá um 404 conhecido e inofensivo.

## Fluxos que valem dirigir

- Superfície no spawn (meio do mundo): colinas, grama com borda clara, camada de terra.
- Descida lenta (S sem Shift, screenshots a cada ~1s): transição terra→pedra, cobre raso, ferro médio.
- Fundo (Shift+S até clampar): cavernas grandes, ouro, linha de bedrock.
- Bordas do mundo (A/D segurado): clamp da câmera sem faixas fora do mundo.
- Resize do viewport com o jogo rodando.

## Gotchas

- Com Shift, a câmera cruza o mundo verticalmente em ~2s — screenshots consecutivos no fundo saem idênticos (clamp). Para ver profundidades médias, descer SEM Shift.
- Mundo é determinístico por `WORLD_SEED`: as mesmas capturas devem sair iguais entre execuções.
