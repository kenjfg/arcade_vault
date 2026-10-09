# Sugerencias de juegos: To Do

> Mantenido por el agente `game-planner` (`.claude/agents/game-planner.md`). Puedes marcar `[x]` o mover entradas a mano; el agente respeta los cambios en su siguiente ejecución.

Formato: `- [ ] **TÍTULO** (`code`) · CATEGORÍA · color · origen · sugerido AAAA-MM-DD: motivo`

## Pendientes

- [ ] **GLOTÓN** (`gloton`) · ARCADE · yellow · origen: mock `gloton` (desde cero) · sugerido 2026-10-08: único color (yellow) sin juego real, mecánica de laberinto + persecución distinta a todo el catálogo y portada `cover-glot` ya hecha

## En spec

## Implementados

- [x] **ASTEROIDS** (`asteroids`) · SHOOTER · cyan · origen: referencia 02-asteroids · SPEC 05
- [x] **TETRIS** (`tetris`) · PUZZLE · magenta · origen: mock `caida` / referencia 03-tetris · SPEC 07
- [x] **ARKANOID** (`arkanoid`) · ARCADE · cyan · origen: mock `bloque-buster` / referencia 04-arkanoid · SPEC 08
- [x] **SNAKE** (`snake`) · ARCADE · green · origen: mock `serpentina` (desde cero, `snake-assets`) · SPEC 09

## Ideas en reserva

Ronda de 15 ideas (2026-10-08), en orden de prioridad propuesto. Las filas nuevas necesitan `sort_order` desde 10 (renumerar al hacer el spec) y portada `.cover-*` nueva salvo que se indique.

- [ ] **FUSIÓN** (`fusion`) · PUZZLE · yellow · origen: fila nueva (desde cero, tipo 2048) · sugerido 2026-10-08: esfuerzo bajo, 2.º PUZZLE y cubre yellow; puntuación = suma de fusiones con bonus por multi-fusión
- [ ] **INVASORES** (`invasores`) · SHOOTER · green · origen: mock `invasores` (desde cero, tipo Space Invaders) · sugerido 2026-10-08: el más simple de construir, mock y `cover-invaders` ya existen, pero sería el segundo shooter y repite color green
- [ ] **TORRE NEÓN** (`torre-neon`) · ARCADE · yellow · origen: fila nueva (desde cero, stack de un botón) · sugerido 2026-10-08: esfuerzo bajo, partidas de 30–90 s, combos de perfectos separan el leaderboard
- [ ] **CICLOS DE LUZ** (`ciclos`) · VERSUS · magenta · origen: fila nueva o mock `duelo-pixel` (desde cero, Tron vs CPU) · sugerido 2026-10-08: primer VERSUS real con puntuación individual clara; riesgo: IA por flood fill
- [ ] **DEFENSA MISIL** (`defensa-misil`) · SHOOTER · yellow · origen: mock `rocas` (desde cero, tipo Missile Command) · sugerido 2026-10-08: convierte el mock duplicado de Asteroids en una mecánica nueva; necesita `cover-misil`
- [ ] **FUGA NEÓN** (`fuga-neon`) · ARCADE · magenta · origen: fila nueva (desde cero, runner con cambio de gravedad) · sugerido 2026-10-08: género nuevo, un botón, multiplicador por roce
- [ ] **RANARIA** (`ranaria`) · ARCADE · green · origen: mock `ranaria` (desde cero, tipo Frogger) · sugerido 2026-10-08: mecánica de cruce única y `cover-rana` existe, pero tercer ARCADE y otra vez green; puntos por fila nueva para no inflar con el temporizador
- [ ] **CIEMPIÉS** (`ciempies`) · SHOOTER · magenta · origen: fila nueva (desde cero, tipo Centipede) · sugerido 2026-10-08: puntuación con riesgo/recompensa (araña), 2.º magenta; satura SHOOTER si entra con Invasores
- [ ] **ALUNIZAJE** (`alunizaje`) · ARCADE · cyan · origen: fila nueva (desde cero, tipo Lunar Lander) · sugerido 2026-10-08: precisión en vez de reflejos; repite controles de Asteroids y sería el 3.er cyan (cambiar color)
- [ ] **JOYAS** (`joyas`) · PUZZLE · green · origen: fila nueva (desde cero, match-3 contra reloj) · sugerido 2026-10-08: partidas cortas con cascadas; riesgo: cursor con teclado
- [ ] **BURBUJAS** (`burbujas`) · PUZZLE · cyan · origen: fila nueva (desde cero, tipo Puzzle Bobble) · sugerido 2026-10-08: cadenas de burbujas colgantes premian la habilidad; esfuerzo medio-alto (grilla hexagonal)
- [ ] **ENJAMBRE** (`enjambre`) · SHOOTER · green · origen: fila nueva (desde cero, bullet-hell ligero) · sugerido 2026-10-08: multiplicador por roce muy competitivo; otro SHOOTER más
- [ ] **PULSO** (`pulso`) · ARCADE · cyan · origen: fila nueva (desde cero, ritmo de 4 carriles) · sugerido 2026-10-08: precisión y combo; riesgo: sin audio en el playbook
- [ ] **REVERSO** (`reverso`) · VERSUS · yellow · origen: fila nueva (desde cero, Othello vs escalera de CPUs) · sugerido 2026-10-08: VERSUS por turnos con puntuación clara; partidas largas (3–5 min)
- [ ] **CRIPTA** (`cripta`) · PUZZLE · yellow · origen: fila nueva (desde cero, roguelite por turnos) · sugerido 2026-10-08: muy rejugable; el más caro de todos

## Descartados
