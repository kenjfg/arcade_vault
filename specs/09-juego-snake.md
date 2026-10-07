# SPEC 09 — Juego Snake jugable con leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-10-07
> **Objective:** Diseñar desde cero un Snake como juego real `snake` (convirtiendo el mock SERPENTINA), con las frutas de `references/source-assets/snake-assets/`, dentro de `/juegos/snake/jugar` y con sus puntuaciones en el leaderboard de Supabase.

## Scope

**In:**

- **Conversión del mock SERPENTINA** con una migración nueva (`UPDATE` de la fila `code = 'serpentina'`):
  - `code` pasa de `serpentina` a `snake`, y `title` de `SERPENTINA` a `SNAKE`.
  - `playable` pasa a `true`.
  - `long_desc` nuevo: "Una serpiente de luz recorre la grilla buscando fruta. Cada bocado la alarga y suma puntos, y cada cinco frutas acelera. Un choque contra la pared o contra tu propia cola y se acabó."
  - Se mantienen la categoría `arcade`, la portada `cover-snake`, el color `green`, `sort_order` 4 y `short_desc` ("Crece sin morder tu propia cola.").
  - Las URLs `/juegos/serpentina` y `/juegos/serpentina/jugar` dejan de existir (404). `/salon-de-la-fama?juego=serpentina` cae al primer juego, como cualquier código inexistente.
- **Asset:** `references/source-assets/snake-assets/fruits.png` se copia tal cual a `public/games/snake/fruits.png` (se crea `public/`). `sprites.js` no se copia. Sus recortes pasan a `constants.ts` (ver Data model).
- **Motor** en TypeScript en `lib/games/snake/`, diseñado desde cero:
  - **Tablero** de 20×15 celdas de 40 px lógicos. Ocupa todo el canvas de 800×600, sin paneles laterales.
  - **Serpiente inicial** de 3 celdas en la fila 7: cabeza en la columna 10 y cuerpo en las columnas 9 y 8, mirando a la derecha.
  - **Movimiento por ticks:** en cada tick la cabeza avanza una celda en la dirección actual. El tick dura `max(60, 150 − (nivel − 1) × 10)` ms: 150 ms en el nivel 1 y 60 ms a partir del nivel 10. El `dt` se suma a un acumulador, sin `setInterval`.
  - **Giros** con `←` `↑` `→` `↓` y con `A` `W` `D` `S`. Cada pulsación se añade a una cola de como mucho 2 giros pendientes. Cada tick consume uno. Un giro se descarta al encolarlo si es igual a la última dirección (la de la cola, o la actual si la cola está vacía) o si es su opuesta (180°). Con la cola llena, las pulsaciones nuevas se ignoran.
  - **Fruta:** siempre hay exactamente una. Aparece en una celda libre elegida al azar (uniforme entre las que no ocupa la serpiente) y su sprite se sortea entre los 22 recortes. Todas las frutas valen lo mismo.
  - **Comer:** cuando la cabeza entra en la celda de la fruta, la serpiente crece 1 celda (ese tick la cola no avanza), suma **10 × nivel** puntos (con el nivel de antes de comer) y aparece una fruta nueva.
  - **Nivel** `floor(frutas comidas / 5) + 1`, recalculado tras cada fruta junto con la duración del tick.
  - **Muerte:** la cabeza sale del tablero o entra en una celda del cuerpo. La celda que deja la cola en ese mismo tick cuenta como libre, salvo cuando la serpiente come en ese tick. Hay **una sola vida**: morir termina la partida.
  - **Tablero lleno:** si tras comer no queda ninguna celda libre para la fruta (serpiente de 300 celdas), la partida termina igual que al morir.
  - Sin variables globales. Los listeners de teclado se registran al crear el motor y se quitan en `destroy()`.
- **Dibujo** en un canvas lógico de 800×600 escalado a `.crt-screen`:
  - Rejilla tenue de 20×15 y un borde neón verde en el contorno del tablero.
  - Serpiente vectorial neón: cuerpo en verde (`#00ff88`) y cabeza en cian (`#00f5ff`), con glow moderado.
  - Fruta: su recorte de `fruits.png` (fila pixel art), escalado a 1/5 (32 px lógicos de alto, ancho proporcional) y centrado en su celda, con `imageSmoothingEnabled = false`. Mientras la imagen no ha cargado, o si falla, se dibuja en su lugar un círculo magenta neón (`#ff006e`).
  - El canvas no dibuja puntuación, nivel, vidas, PAUSA, GAME OVER ni texto de victoria.
- **Componente** `components/games/snake-canvas.tsx`, con la misma estructura que `arkanoid-canvas.tsx`:
  - **Pantalla de inicio:** el tablero, la serpiente inicial quieta y la primera fruta, bajo el overlay "SNAKE" / "PULSA ESPACIO PARA EMPEZAR" (título en `neon-green`). Nada se mueve hasta pulsar Espacio. Después, la serpiente empieza a avanzar hacia la derecha.
  - **Pausa:** el botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el motor, con el overlay "EN PAUSA" que ya existe.
  - **Auto-pausa:** `visibilitychange` (oculta) y `blur` de la ventana pausan durante una partida.
- **Registry:** entrada `snake` en `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: null, level: 1 }`.
- **HUD:** PUNTUACIÓN es la puntuación del motor y NIVEL es el nivel del motor. VIDAS no se muestra (`lives: null`, como en Tetris). `PlayerHud` no cambia.
- **Fin de partida:**
  - Al morir o al llenar el tablero, la escena queda congelada 1 s y después se llama a `onGameOver` una sola vez. El modal "FIN DEL JUEGO" se abre con la puntuación final.
  - FIN detiene el motor y abre el modal con la puntuación actual.
  - GUARDAR PUNTUACIÓN usa el `submitScore` que ya existe.
  - JUGAR DE NUEVO deja la serpiente inicial, una fruta nueva, la puntuación a 0, el nivel a 1 y la pantalla de inicio.
- Sin cambios en el leaderboard: `scores`, `leaderboard`, `game_stats`, RLS, `submitScore`, `lib/games-db.ts`, el detalle, el Salón de la Fama, la biblioteca, `GameOverModal`, `PlayerHud` y `game-player.tsx` funcionan igual. El juego solo necesita la fila `playable`, el motor, el componente, la entrada del registry y el PNG en `public/`.

**Out of scope (for future specs):**

- Valor distinto por tipo de fruta, fruta bonus temporal y power-ups.
- Paredes que se atraviesan, obstáculos y laberintos por nivel.
- Varias vidas.
- Esperar a la primera dirección para arrancar.
- Las filas cartoon y realista de `fruits.png`.
- Sonido.
- Controles táctiles o gamepad.
- Portada propia `cover-snake` nueva y cambios en `short_desc`.
- Redirigir `/juegos/serpentina` a `/juegos/snake`.
- Extraer un hook común a los componentes de canvas.
- Antitrampas o verificación de la puntuación en servidor.

## Data model

No hay tablas nuevas. La migración cambia una fila de `games`.

**Migración** `supabase/migrations/<timestamp>_convert_serpentina_to_snake.sql` (con `npx supabase migration new convert_serpentina_to_snake`):

- `UPDATE public.games` donde `code = 'serpentina'`: `code = 'snake'`, `title = 'SNAKE'`, `playable = true` y el `long_desc` nuevo del Scope.
- No toca `short_desc`, `category_id`, `cover`, `color` ni `sort_order` (4).
- `serpentina` nunca fue `playable`, así que no tiene filas en `scores` que migrar.

**API pública del motor** (`lib/games/snake/engine.ts`):

```ts
export interface SnakeStats {
  score: number;
  lives: null; // una sola vida: el HUD no muestra VIDAS
  level: number; // empieza en 1
}

export interface SnakeCallbacks {
  onStats: (stats: SnakeStats) => void; // solo cuando cambia la puntuación o el nivel
  onGameOver: (finalScore: number) => void; // 1 s después de morir o de llenar el tablero
}

export interface SnakeGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: detiene el motor sin llamar a onGameOver
  restart(): void; // estado inicial y vuelta a ready
  destroy(): void; // cancela el requestAnimationFrame, quita los listeners y suelta la imagen
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame;
```

Fases internas del motor:

```ts
type Phase = "ready" | "playing" | "gameover" | "ended";
```

Convenciones:

- `ready`: se dibujan el tablero, la serpiente inicial y la primera fruta, todo quieto. El motor ignora el teclado.
- `playing`: `start()` pone en marcha los ticks con dirección derecha y la cola de giros vacía.
- `gameover`: se usa al morir y al llenar el tablero. La escena se queda congelada 1 s sin aceptar teclas, y después se llama a `onGameOver` una sola vez. Al morir, la cabeza no avanza a la celda del choque.
- `ended`: tras FIN no se actualiza nada ni se llama a `onGameOver`.
- La pausa es un flag aparte de la fase. En pausa no se actualiza nada ni se aceptan giros, y `lastTime` se reinicia al reanudar para que no haya salto.
- `dt` está limitado a 50 ms y se suma al acumulador del tick. Como el tick mínimo es de 60 ms, nunca hay más de un tick por frame.
- La cola de giros se vacía en `pause()`, `end()` y `restart()`.
- `preventDefault` en las flechas y en Espacio, solo en `ready` y `playing`, y nunca con el foco en un `input` o `textarea`. `W` `A` `S` `D` no necesitan `preventDefault`, pero tampoco hacen nada con el foco en un campo de texto. El Espacio no tiene acción en el motor.
- `P`, `Esc`, Espacio para empezar y la auto-pausa los gestiona el componente de React, no el motor.
- La imagen se crea con `new Image()` y `src = "/games/snake/fruits.png"` al crear el motor. `destroy()` quita sus handlers `onload`/`onerror`. El dibujo comprueba si ya cargó en cada frame.
- Las frutas guardan un índice al recorte, no un nombre.

**Constantes** (`lib/games/snake/constants.ts`): tamaño lógico 800×600, tablero 20×15 y celda de 40, serpiente inicial (3 celdas, cabeza en 10/7, dirección derecha), tamaño de la cola de giros (2), fórmula del tick (150, −10 por nivel, mínimo 60), 10 puntos base por fruta, 5 frutas por nivel, retraso de game over de 1 s, ruta del PNG, escala del sprite (1/5) y colores (`#00ff88` cuerpo y borde, `#00f5ff` cabeza, `#ff006e` fruta de reserva).

**Recortes de las frutas** en `constants.ts` (`FRUIT_SPRITES: readonly { x: number; y: number; w: number; h: number }[]`), los 22 de `sprites.js` en el mismo orden, sin nombres. Todos tienen `y = 136` y `h = 160`. Los pares `x`/`w`, en orden:

34/110, 186/150, 378/110, 540/130, 712/130, 894/110, 1066/110, 1228/130, 1400/130, 1582/110, 1734/150, 1906/150, 2068/170, 2250/140, 2432/130, 2604/130, 2786/110, 2948/130, 3110/150, 3302/110, 3454/150, 3637/130.

Los nombres de `sprites.js` no coinciden con la imagen (el recorte `banana` es una fruta roja y `orange` es el plátano), así que no se portan.

**Archivos:**

| Archivo                                                           | Cambio                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/<timestamp>_convert_serpentina_to_snake.sql` | Nuevo: `UPDATE` de `serpentina` a `snake` con el `long_desc` nuevo                                           |
| `lib/supabase/database.types.ts`                                  | Regenerado con `npm run db:types` (no se esperan cambios de tipos)                                           |
| `public/games/snake/fruits.png`                                   | Nuevo: copia de `references/source-assets/snake-assets/fruits.png`                                           |
| `lib/games/snake/constants.ts`                                    | Nuevo: tablero, serpiente inicial, tiempos, puntos, colores, ruta y recortes de las frutas                   |
| `lib/games/snake/engine.ts`                                       | Nuevo: `createSnakeGame`: estado, bucle, input con cola, colisiones, fruta, nivel, fases, dibujo y callbacks |
| `components/games/snake-canvas.tsx`                               | Nuevo: Client Component que monta el canvas y el motor, y dibuja el overlay de inicio                        |
| `components/games/registry.ts`                                    | Añade la entrada `snake`                                                                                     |

La serpiente y la fruta son arrays de celdas y funciones puras, así que no hay `entities.ts`. Viven en `engine.ts`.

## Implementation plan

1. **Migración.** Crear `convert_serpentina_to_snake` y aplicarla con `npx supabase db push`. Revisar `get_advisors` de seguridad y ejecutar `npm run db:types`.
   - Resultado: SNAKE aparece en cuarta posición en la Home, la biblioteca y el Salón, con las URLs `/juegos/snake` y el `long_desc` nuevo.
   - Su reproductor sigue con la simulación y el modal dice "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES", porque todavía no está en el registry.
2. **Asset y constantes.** Leer antes la sección de la carpeta `public` en `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`. Copiar `fruits.png` a `public/games/snake/` y crear `lib/games/snake/constants.ts` según el modelo de datos. Todavía no se usan, pero `/games/snake/fruits.png` ya se sirve en `npm run dev`.
3. **Motor.** Crear `lib/games/snake/engine.ts` con `createSnakeGame` según el modelo de datos: estado, bucle con `requestAnimationFrame` y acumulador de ticks, teclado con cola de giros, movimiento, colisiones, fruta, crecimiento, puntuación, nivel, tablero lleno, fases, carga de la imagen, dibujo y callbacks. Todavía no se usa.
4. **Componente y registry.** Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`. Crear `components/games/snake-canvas.tsx` con la estructura de `arkanoid-canvas.tsx`: `ResizeObserver` con DPR máximo 2, handle `end`/`restart`, `useEffectEvent`, overlay "SNAKE" / "PULSA ESPACIO PARA EMPEZAR", `P`/`Esc` y auto-pausa. Añadir `snake` a `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: null, level: 1 }`.
   - Resultado: `/juegos/snake/jugar` se juega de principio a fin. El HUD muestra puntuación y nivel, sin VIDAS.
5. **Verificación del flujo completo.** Comprobar PAUSA, FIN, game over con 1 s de espera, el modal, GUARDAR PUNTUACIÓN con `submitScore` y JUGAR DE NUEVO, y corregir lo que falle. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [x] `supabase/migrations/` contiene `convert_serpentina_to_snake`, y `npx supabase migration list` la muestra aplicada en local y en remoto.
- [x] En `games` ya no existe `serpentina`. La fila `snake` tiene `title = 'SNAKE'`, `playable = true`, categoría `arcade`, `cover-snake`, `green`, `sort_order` 4, el `short_desc` de SERPENTINA y el `long_desc` nuevo. Las demás filas no cambian.
- [x] Los advisors de seguridad no muestran avisos nuevos.
- [x] SNAKE aparece en cuarta posición en `/juegos` y en la Home, y como pestaña del Salón de la Fama, con la portada `cover-snake`.
- [x] `/juegos/serpentina` da 404.
- [x] `/juegos/snake/jugar` muestra el tablero, la serpiente de 3 celdas en el centro mirando a la derecha y una fruta, bajo el texto "PULSA ESPACIO PARA EMPEZAR". Nada se mueve hasta pulsar Espacio.
- [x] Al pulsar Espacio, la serpiente avanza sola hacia la derecha una celda por tick.
- [x] Las flechas y `W` `A` `S` `D` giran la serpiente. Pulsar la dirección opuesta a la actual no hace nada.
- [x] Pulsar dos giros seguidos muy rápido (p. ej. `↑` y `←` yendo a la derecha) hace los dos giros en ticks consecutivos, sin que la serpiente se muerda.
- [x] La fruta es siempre uno de los 22 sprites pixel art de `fruits.png`, nítido y centrado en su celda, y nunca aparece encima de la serpiente.
- [x] Comer una fruta en el nivel 1 suma exactamente 10 puntos y alarga la serpiente 1 celda. En el nivel N suma exactamente 10 × N.
- [x] Al comer la quinta fruta, el NIVEL del HUD pasa a 02 y la serpiente va más rápido. Esa quinta fruta todavía suma 10.
- [x] Salir del tablero por cualquier lado termina la partida.
- [x] Chocar con el propio cuerpo termina la partida. Entrar en la celda que deja la cola en ese mismo tick no la termina.
- [x] Al morir, la escena se ve congelada 1 s y después se abre "FIN DEL JUEGO" con la puntuación final.
- [x] El HUD muestra la puntuación y el nivel del motor y no muestra la casilla VIDAS.
- [x] El canvas no dibuja puntuación, nivel, vidas, PAUSA, GAME OVER ni texto de victoria.
- [x] PAUSA, `P` y `Esc` congelan el juego y muestran "EN PAUSA". REANUDAR, `P` y `Esc` lo reanudan sin que la serpiente avance de golpe. Un giro pulsado durante la pausa no se aplica al reanudar.
- [x] Cambiar de pestaña o de ventana durante una partida la deja en EN PAUSA.
- [x] FIN a mitad de partida detiene el juego y abre el modal con la puntuación actual.
- [x] GUARDAR PUNTUACIÓN inserta una fila en `scores` para `snake`. Después, `/juegos/snake` muestra Partidas, Mejor global y el jugador en el ranking, y `/salon-de-la-fama?juego=snake` lo muestra.
- [x] JUGAR DE NUEVO deja la puntuación en 0, el nivel en 01 y la serpiente inicial, y vuelve a mostrar "PULSA ESPACIO PARA EMPEZAR".
- [x] Durante la partida, las flechas y Espacio no hacen scroll de la página. En el modal, el campo de iniciales acepta espacios, flechas, `W` `A` `S` `D` y cualquier otra tecla.
- [x] Tras salir con SALIR o VOLVER AL VAULT, las teclas no hacen nada en otras pantallas y no hay errores en la consola.
- [x] Entrar y salir del reproductor varias veces no acelera la serpiente.
- [x] Si `/games/snake/fruits.png` no carga (p. ej. bloqueado en DevTools), la fruta se ve como un círculo magenta y el juego sigue funcionando.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y ocupa todo el `.crt-screen`, también a 375 px de ancho.
- [x] Asteroids, Tetris y Arkanoid se siguen jugando exactamente igual que en los SPEC 05, 07 y 08.
- [x] En un mock (p. ej. GLOTÓN) se ve la simulación y el modal "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- [x] `sprites.js` no se importa ni se copia en `app/`, `components/`, `lib/` ni `public/`. De `references/` solo se copia `fruits.png`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** convertir el mock SERPENTINA en Snake. Decisión del usuario. Es el mismo juego y evita tener dos serpientes en el catálogo.
- **No:** fila nueva `snake` manteniendo SERPENTINA como mock.
- **Yes:** cambiar el `code` a `snake` y el título a `SNAKE`. Decisión del usuario, igual que CAÍDA → TETRIS y BLOQUE BUSTER → ARKANOID, aceptando que `/juegos/serpentina` pase a dar 404.
- **No:** conservar `code = serpentina`.
- **Yes:** mantener `arcade`, `cover-snake`, `green`, `sort_order` 4 y `short_desc`, y reescribir `long_desc`. Decisión del usuario: el texto actual habla de "núcleos magenta" y el juego tiene frutas.
- **No:** mantener los textos tal cual. **No:** textos nuevos completos.
- **Yes:** frutas con los sprites pixel art de `fruits.png` y serpiente vectorial neón. Decisión del usuario. Es el primer juego que usa un asset de imagen, y por eso se crea `public/`.
- **No:** todo vectorial. **No:** las filas cartoon o realista, que no tienen recortes medidos.
- **Yes:** escala 1/5 sin suavizado. Los bloques del pixel art (unos 10 px en el original) quedan en 2 px lógicos exactos y la fruta cabe en una celda de 40.
- **Yes:** los recortes se portan como lista sin nombres. Los nombres de `sprites.js` están mal y las frutas son decorativas, así que no hacen falta.
- **Yes:** círculo magenta mientras la imagen no carga o si falla. El juego no espera a la imagen para poder empezar.
- **Yes:** todas las frutas valen igual y el sprite se sortea. Decisión del usuario.
- **No:** valor por tipo de fruta o fruta bonus temporal. Son mecánicas extra para otro spec.
- **Yes:** tablero de 20×15 celdas de 40 px que ocupa todo el canvas. Decisión del usuario: celdas grandes para que los sprites se vean en móvil.
- **No:** 32×24 de 25 px. **No:** tablero cuadrado centrado con laterales.
- **Yes:** las paredes matan. Decisión del usuario: es el Snake clásico.
- **No:** paredes que se atraviesan.
- **Yes:** 10 × nivel por fruta, nivel cada 5 frutas y tick `max(60, 150 − (nivel − 1) × 10)` ms. Decisión del usuario. La fruta puntúa con el nivel de antes de comerla, como las líneas en Tetris. La puntuación máxima teórica (297 frutas) queda muy por debajo de 10 000 000.
- **No:** 10 puntos fijos. **No:** velocidad constante sin niveles.
- **Yes:** una sola vida con `lives: null`. Decisión del usuario: `PlayerHud` ya lo soporta desde el SPEC 07.
- **No:** 3 vidas con reaparición.
- **Yes:** flechas y `W` `A` `S` `D`, con una cola de 2 giros. Decisión del usuario: no se pierden pulsaciones rápidas y no hay muertes injustas por girar dos veces en un tick.
- **No:** solo flechas. **No:** solo el último giro de cada tick.
- **Yes:** la celda que deja la cola cuenta como libre en ese tick, salvo al comer. Es el comportamiento habitual del Snake y evita muertes que no se ven en pantalla.
- **Yes:** escena inicial quieta y arranque hacia la derecha con Espacio. Decisión del usuario, igual que Arkanoid.
- **No:** esperar a la primera dirección. Añadía una fase. **No:** fondo vacío.
- **Yes:** 1 s con la escena congelada antes del modal, y llenar el tablero termina la partida igual. Decisión del usuario, igual que los demás juegos.
- **No:** modal inmediato.
- **Yes:** migración primero, como en el SPEC 08. Decisión del usuario: entre pasos, `snake` no está en el registry y no puede guardar puntuaciones simuladas.
- **Yes:** `PlayerHud` y `game-player.tsx` no cambian.
- **Yes:** copiar la estructura de `arkanoid-canvas.tsx` en lugar de extraer un hook común. No se toca código de los otros juegos salvo la línea del registry.
- **Yes:** no se cambia el leaderboard. La puntuación es un entero creciente.
- **No:** sonido, táctil ni gamepad. Ningún juego del portal los tiene todavía.

## Risks

| Risk                                                                               | Mitigation                                                                                                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| La imagen no carga o tarda, y la fruta no se ve                                    | Círculo magenta de reserva hasta que `complete` sea verdadero. Hay un criterio de aceptación.                                           |
| Los recortes copiados de `sprites.js` no encajan con la imagen                     | Se comprueban a ojo al implementar el paso 4: cada fruta debe verse entera y sin trozos de la vecina.                                   |
| El sprite se ve borroso al escalar                                                 | `imageSmoothingEnabled = false` antes de cada `drawImage`, porque cambiar el tamaño del canvas lo reinicia.                             |
| Dos giros rápidos en un mismo tick hacen que la serpiente se muerda                | Cola de 2 giros validada contra la última dirección encolada. Hay un criterio de aceptación.                                            |
| Un giro pulsado antes de pausar se aplica de golpe al reanudar                     | La cola se vacía en `pause()`, `end()` y `restart()`.                                                                                   |
| El motor bloquea teclas en el input de iniciales                                   | `preventDefault` solo en `ready` y `playing`, nunca con el foco en un `input` o `textarea`, y el motor no hace nada fuera de `playing`. |
| Bucles, listeners o el `onload` de la imagen sobreviven al desmontar (Strict Mode) | `destroy()` cancela el rAF, quita los listeners y los handlers de la imagen. Se prueba entrando y saliendo varias veces.                |
| Salto de ticks al volver de una pausa o de una pestaña oculta                      | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.                                                                              |
| Enlaces externos o marcadores a `/juegos/serpentina` dan 404                       | Aceptado por el usuario. La redirección queda fuera de alcance.                                                                         |
| Cambiar `code` con un `UPDATE` deja la página `/juegos/serpentina` en caché        | `npm run build` regenera las rutas. En desarrollo basta con recargar.                                                                   |
| `shadowBlur` en una serpiente larga baja los FPS                                   | Glow moderado y solo en la cabeza y el contorno, o solo en la cabeza si se nota.                                                        |

## What is **not** in this spec

- Valor por tipo de fruta, fruta bonus y power-ups.
- Paredes que se atraviesan, obstáculos y laberintos.
- Varias vidas y arranque con la primera dirección.
- Las filas cartoon y realista de `fruits.png`.
- Sonido, controles táctiles y gamepad.
- Portada o `short_desc` nuevos, y la redirección de `/juegos/serpentina`.
- Hook común para los componentes de canvas.
- Antitrampas y cambios en el leaderboard.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
