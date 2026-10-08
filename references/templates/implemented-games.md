# Juegos implementados en Arcade Vault

Juegos reales y jugables (`games.playable = true`) del catálogo de Supabase, en el orden de la biblioteca (`sort_order`). Datos consultados el 2026-10-08; jugadas y récords cambian con cada partida.

## Resumen

| #   | Código      | Título    | Categoría | Color   | Vidas | Spec    | Jugadas | Récord | Líder  |
| --- | ----------- | --------- | --------- | ------- | ----- | ------- | ------- | ------ | ------ |
| 1   | `asteroids` | ASTEROIDS | SHOOTER   | cyan    | 3     | SPEC 05 | 2       | 5030   | KENNY  |
| 2   | `arkanoid`  | ARKANOID  | ARCADE    | cyan    | 3     | SPEC 08 | 1       | 580    | KEN    |
| 3   | `tetris`    | TETRIS    | PUZZLE    | magenta | —     | SPEC 07 | 2       | 1774   | TUREY  |
| 4   | `snake`     | SNAKE     | ARCADE    | green   | —     | SPEC 09 | 1       | 420    | JEJEJE |

"—" en Vidas: el juego tiene una sola vida y el HUD oculta VIDAS (`lives: null` en `components/games/registry.ts`).

En todos los juegos, `P` o `Esc` pausan, y la partida se pausa sola al cambiar de pestaña o perder el foco de la ventana.

---

## 1. ASTEROIDS

- **Código / URL:** `asteroids` → `/juegos/asteroids/jugar`
- **Categoría:** SHOOTER · **Color:** cyan · **Portada:** `cover-rocas`
- **Descripción corta:** Esquiva y destruye rocas en un espacio sin bordes.
- **Descripción larga:** Pilota una nave vectorial en un campo de asteroides donde el espacio se enrosca sobre sí mismo. Cada roca que revientas se parte en fragmentos más rápidos. Atrapa el núcleo verde para disparar en abanico y limpia el sector antes de que llegue la siguiente oleada.
- **Origen:** porte a TypeScript de `references/started-games/02-asteroids/` (SPEC 05). Fue el primer juego real y ya estaba en el catálogo inicial (SPEC 06).
- **Controles:** `←` `→` girar · `↑` impulso · `Espacio` disparar.
- **HUD inicial:** puntuación 0 · vidas 3 · nivel 1.
- **Código:** `lib/games/asteroids/` (`constants.ts`, `entities.ts`, `engine.ts`) · `components/games/asteroids-canvas.tsx`.

## 2. ARKANOID

- **Código / URL:** `arkanoid` → `/juegos/arkanoid/jugar`
- **Categoría:** ARCADE · **Color:** cyan · **Portada:** `cover-bricks`
- **Descripción corta:** Rebota la pelota y destruye muros de neón.
- **Descripción larga:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?
- **Origen:** porte a TypeScript de `references/started-games/04-arkanoid/` (SPEC 08). Convirtió el mock BLOQUE BUSTER (migración `20261006233532_convert_bloque_buster_to_arkanoid.sql`).
- **Controles:** `←` `→` mover la paleta.
- **HUD inicial:** puntuación 0 · vidas 3 · nivel 1.
- **Código:** `lib/games/arkanoid/` (`constants.ts`, `levels.ts`, `engine.ts`) · `components/games/arkanoid-canvas.tsx`.

## 3. TETRIS

- **Código / URL:** `tetris` → `/juegos/tetris/jugar`
- **Categoría:** PUZZLE · **Color:** magenta · **Portada:** `cover-tetro`
- **Descripción corta:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción larga:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.
- **Origen:** porte a TypeScript de `references/started-games/03-tetris/` (SPEC 07). Convirtió el mock CAÍDA (migración `20261002174355_convert_caida_to_tetris.sql`).
- **Controles:** `←` `→` mover · `↑` o `X` rotar · `↓` bajar rápido · `Espacio` caída instantánea.
- **HUD inicial:** puntuación 0 · sin vidas · nivel 1.
- **Código:** `lib/games/tetris/` (`constants.ts`, `engine.ts`) · `components/games/tetris-canvas.tsx`.

## 4. SNAKE

- **Código / URL:** `snake` → `/juegos/snake/jugar`
- **Categoría:** ARCADE · **Color:** green · **Portada:** `cover-snake`
- **Descripción corta:** Crece sin morder tu propia cola.
- **Descripción larga:** Una serpiente de luz recorre la grilla buscando fruta. Cada bocado la alarga y suma puntos, y cada cinco frutas acelera. Un choque contra la pared o contra tu propia cola y se acabó.
- **Origen:** diseñado desde cero (SPEC 09) con las frutas de `references/source-assets/snake-assets/`. Convirtió el mock SERPENTINA (migración `20261007183028_convert_serpentina_to_snake.sql`).
- **Controles:** `←` `↑` `→` `↓` cambiar de dirección.
- **HUD inicial:** puntuación 0 · sin vidas · nivel 1.
- **Código:** `lib/games/snake/` (`constants.ts`, `engine.ts`) · `components/games/snake-canvas.tsx`.

---

## Puntuaciones

Todos comparten el mismo leaderboard genérico: tabla `scores` (nombre de 1 a 10 caracteres, puntuación entre 0 y 10 000 000), vistas `leaderboard` y `game_stats`, y la Server Action `submitScore` (`app/juegos/[id]/jugar/actions.ts`). Para añadir un juego nuevo, usa `/game-spec` y sigue `.claude/skills/game-spec/playbook.md`.
