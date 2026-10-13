# SPEC 12 — Juego Frogger jugable con leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 06, SPEC 09, SPEC 10, SPEC 11
> **Date:** 2026-10-13
> **Objective:** Diseñar desde cero el juego real `frogger` (convirtiendo el mock RANARIA), jugable con teclado y con el gamepad táctil dentro de `/juegos/frogger/jugar`, con sus puntuaciones en el leaderboard de Supabase.

## Why this spec exists

No hay referencia en `references/started-games/` para Frogger. Este spec promueve el SPEC JAM `specs/game-jam/frogger/spec.md` (2026-10-08), que ya diseñaba el juego desde cero. Ese spec es anterior a los SPEC 10 y 11, así que aquí se actualiza con lo que ahora es obligatorio para un juego real: el mapeo `touch` del registry, el inicio tocando la pantalla y la lectura del teclado solo por `e.code`. Las mecánicas, la tabla de carriles y la puntuación son las del jam.

## Scope

**In:**

- **Conversión del mock RANARIA** con una migración nueva (`UPDATE` de la fila `code = 'ranaria'`):
  - `code` pasa de `ranaria` a `frogger`, y `title` de `RANARIA` a `FROGGER`.
  - `playable` pasa a `true`.
  - Se mantienen la categoría `arcade`, la portada `cover-rana`, el color `green`, `sort_order` 8 y los textos actuales: `short_desc` ("Cruza la autopista de pixeles.") y `long_desc` ("Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo."). Ya describen el juego.
  - Las URLs `/juegos/ranaria` y `/juegos/ranaria/jugar` dejan de existir (404). `/salon-de-la-fama?juego=ranaria` cae al primer juego, como cualquier código inexistente.
- **Sin assets:** todo es vectorial. No se añade nada en `public/`.
- **Motor** en TypeScript en `lib/games/frogger/`, diseñado desde cero:
  - **Tablero** de 20 columnas × 15 filas de 40 px lógicos, que ocupa todo el canvas de 800×600. Las filas se numeran de 0 (arriba) a 14 (abajo). El centro vertical de la fila `r` es `r × 40 + 20`.
    - Fila 0 (y 0–40): orilla superior, solo decorativa.
    - Fila 1 (y 40–80): orilla con **5 nenúfares** centrados en `x` = 80, 240, 400, 560 y 720. El resto de la fila es seto.
    - Filas 2–6 (y 80–280): **río**, 5 carriles.
    - Fila 7 (y 280–320): **mediana**, zona segura.
    - Filas 8–12 (y 320–520): **carretera**, 5 carriles.
    - Fila 13 (y 520–560): **acera de salida**, zona segura.
    - Fila 14 (y 560–600): **barra de tiempo** (información del juego dentro del canvas).
  - **Rana:** caja de colisión de 28×28 centrada en su posición. Empieza en `x = 400`, fila 13 (centro `y = 540`).
  - **Saltos:** cada `keydown` de `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight` o `KeyW` `KeyS` `KeyA` `KeyD` (leídos por `e.code`) hace un salto instantáneo. Los `keydown` con `repeat` (tecla física mantenida) se ignoran: un salto por pulsación.
    - `↑`/`↓` cambian de fila en 1. `↓` desde la fila 13 no hace nada.
    - `←`/`→` mueven el centro 40 px. El salto se ignora si el centro quedaría fuera de `[20, 780]`.
    - `↑` desde la fila 2 entra en la fila de nenúfares (ver Nenúfares).
  - **Carreteras** (filas 8–12): coches de 28 px de alto centrados en la fila. Tocar un coche (solape de la caja de la rana con el rectángulo del coche) mata a la rana.
  - **Río** (filas 2–6): troncos y grupos de tortugas. La rana está a salvo si su centro está dentro del ancho de alguna plataforma de su fila. Si no, se ahoga. Sobre una plataforma, la rana se desplaza con la velocidad de esa plataforma. Si su centro sale de `[0, 800]`, muere. La comprobación se hace en cada frame y tras cada salto.
  - **Carriles:** cada carril es una cinta circular sin aleatoriedad. Tiene `n = ⌈(800 + ancho) / separación⌉` objetos, con el objeto `k` empezando en `x = k × separación` (borde izquierdo), y longitud de ciclo `L = n × separación`. Cuando un objeto sale entero por un lado, se desplaza `L` y reaparece por el otro.

    | Fila | Zona      | Objeto         | Sentido | Velocidad base | Ancho | Separación | Color               |
    | ---- | --------- | -------------- | ------- | -------------- | ----- | ---------- | ------------------- |
    | 2    | río       | tronco mediano | →       | 70 px/s        | 160   | 280        | amarillo `#f5ff00`  |
    | 3    | río       | 2 tortugas     | ←       | 80 px/s        | 80    | 200        | cian `#00f5ff`      |
    | 4    | río       | tronco largo   | →       | 90 px/s        | 240   | 380        | amarillo `#f5ff00`  |
    | 5    | río       | tronco corto   | →       | 50 px/s        | 120   | 260        | amarillo `#f5ff00`  |
    | 6    | río       | 3 tortugas     | ←       | 70 px/s        | 120   | 240        | cian `#00f5ff`      |
    | 8    | carretera | camión         | ←       | 70 px/s        | 80    | 300        | cian `#00f5ff`      |
    | 9    | carretera | coche rápido   | →       | 150 px/s       | 40    | 400        | rosa neón `#ff4fd8` |
    | 10   | carretera | coche          | ←       | 100 px/s       | 40    | 280        | magenta `#ff006e`   |
    | 11   | carretera | excavadora     | →       | 80 px/s        | 40    | 240        | cian `#00f5ff`      |
    | 12   | carretera | coche          | ←       | 60 px/s        | 40    | 200        | amarillo `#f5ff00`  |

  - **Velocidad por nivel:** todas las velocidades se multiplican por `min(1 + 0.15 × (nivel − 1), 2.05)`: ×1 en el nivel 1 y ×2.05 a partir del nivel 8. Al subir de nivel, los objetos conservan su posición y solo cambia la velocidad.
  - **Nenúfares:** al saltar desde la fila 2 hacia arriba, si el centro de la rana está a 16 px o menos del centro de un nenúfar libre, la rana ocupa ese nenúfar. Si el nenúfar más cercano a ≤ 16 px está ocupado, o no hay ninguno a ≤ 16 px (seto), la rana muere.
  - **Tiempo:** cada rana tiene 30 s. El tiempo solo corre en `playing` y sin pausa. Al llegar a 0, la rana muere. Se reinicia a 30 s con cada rana nueva (tras llegar a un nenúfar o tras morir).
  - **Puntuación:**
    - Cada salto que lleva a la rana a una fila más alta que la mejor alcanzada por esa rana suma **10 puntos**. La mejor fila se reinicia con cada rana nueva. De la fila 13 a la 2 hay como mucho 11 de estos saltos por rana (110 puntos). Entrar en un nenúfar no suma estos 10.
    - Llegar a un nenúfar suma **50 + 10 × segundos enteros restantes** (`floor` del tiempo que queda). Con 22,4 s restantes suma 270.
    - Ocupar el quinto nenúfar suma además **1 000 puntos**, sube el nivel en 1 y vacía los 5 nenúfares.
    - La puntuación se limita a 10 000 000 (no se alcanza en la práctica: un nivel completo da como mucho 3 300 puntos).
  - **Nivel:** empieza en 1 y sube en 1 cada vez que se llenan los 5 nenúfares. No tiene máximo, pero la velocidad deja de subir en el nivel 8.
  - **Vidas:** 3. Cada muerte (coche, agua, salir del canvas sobre una plataforma, seto, nenúfar ocupado o tiempo agotado) resta 1 vida al momento.
    - Si quedan vidas: 1 s de animación de muerte (el mundo sigue moviéndose, la rana se dibuja como una X magenta y el tiempo no corre). Después aparece una rana nueva en la salida con 30 s.
    - Con 0 vidas: fin de partida.
  - **Rana nueva tras un nenúfar:** aparece al instante en la salida (`x = 400`, fila 13) con 30 s.
  - Sin variables globales. Los listeners de teclado se registran al crear el motor y se quitan en `destroy()`.
- **Dibujo** vectorial neón en un canvas lógico de 800×600 escalado a `.crt-screen`, con glow moderado solo en contornos:
  - Río con relleno azul muy oscuro (`#041a33`). Carretera con relleno `#0d0d1a` y líneas discontinuas entre carriles (`#2a2a40`). Mediana y acera con relleno `#15151f` y contorno magenta tenue (`#ff006e` al 40 %). Orilla y seto en verde tenue (`#00ff88` al 30 %).
  - Nenúfares: contorno magenta (`#ff006e`) en forma de U, de 48 px de ancho. Un nenúfar ocupado dibuja dentro una rana verde quieta.
  - Coches y camiones: rectángulos con contorno en el color de su carril y dos faros en el frente. Troncos: rectángulos redondeados con contorno amarillo. Tortugas: un círculo cian por cada 40 px del grupo.
  - Rana: figura vectorial verde (`#00ff88`) con cuerpo y 4 patas, orientada hacia el último salto.
  - Barra de tiempo en la fila 14: ancho proporcional al tiempo restante (800 px con 30 s), verde (`#00ff88`) con más de 10 s, amarilla (`#f5ff00`) entre 5 y 10 s y magenta (`#ff006e`) con menos de 5 s.
  - El canvas no dibuja puntuación, vidas, nivel, PAUSA ni GAME OVER.
- **Componente** `components/games/frogger-canvas.tsx`, con la misma estructura que `snake-canvas.tsx`:
  - **Pantalla de inicio:** el tablero con todos los carriles en su posición inicial, quietos, la rana en la salida y la barra de tiempo llena, bajo el overlay con el título "FROGGER" en `neon-green` y las dos pistas `av-hint-keys` "PULSA ESPACIO PARA EMPEZAR" y `av-hint-touch` "TOCA PARA EMPEZAR". Nada se mueve hasta empezar.
  - **Empezar:** Espacio, o un `onPointerDown` en el overlay cuyo `pointerType` no sea `"mouse"` (SPEC 10). El motor no marca Espacio como mantenida, así que el inicio táctil no necesita `keyup`.
  - **Pausa:** el botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el motor, con el overlay "EN PAUSA" que ya existe.
  - **Auto-pausa:** `visibilitychange` (oculta) y `blur` de la ventana pausan durante una partida.
- **Registry:** entrada `frogger` en `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: 3, level: 1 }` y este mapeo `touch`:
  - ◀ ▲ ▶ ▼ → `ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`, sin `repeat` (un salto por toque).
  - A → `Space` (empezar).
  - B sin mapeo (atenuado).
- **HUD:** PUNTUACIÓN es la puntuación del motor, VIDAS son las vidas del motor (empiezan en 3) y NIVEL es el número de rondas de 5 nenúfares completadas más 1. `PlayerHud` no cambia.
- **Fin de partida:**
  - Al perder la última vida, la escena queda congelada 1 s (nada se mueve) y después se llama a `onGameOver` una sola vez. El modal "FIN DEL JUEGO" se abre con la puntuación final.
  - FIN detiene el motor y abre el modal con la puntuación actual.
  - GUARDAR PUNTUACIÓN usa el `submitScore` que ya existe.
  - JUGAR DE NUEVO deja los carriles en su posición inicial, los nenúfares vacíos, la rana en la salida, 30 s, la puntuación a 0, 3 vidas, el nivel a 1 y la pantalla de inicio.
- Sin cambios en el leaderboard: `scores`, `leaderboard`, `game_stats`, RLS, `submitScore`, `lib/games-db.ts`, el detalle, el Salón de la Fama, la biblioteca, `GameOverModal`, `PlayerHud`, `game-player.tsx` y `touch-gamepad.tsx` funcionan igual. El juego solo necesita la fila `playable`, el motor, el componente y la entrada del registry.
- **Documentación:**
  - `references/templates/implemented-games.md`: fila de FROGGER en el resumen y sección "5. FROGGER" con el mismo formato que las demás (controles de teclado y táctiles incluidos).
  - `references/templates/game-suggestions-todo.md`: la entrada RANARIA de "Ideas en reserva" pasa a "Implementados" como `**FROGGER** (`frogger`) · ARCADE · green · origen: mock `ranaria` (desde cero, SPEC JAM) · SPEC 12`.
  - `CLAUDE.md`: estado actual con specs 01–12, cinco juegos reales (añade Frogger (12)) y "The next spec is `13-...`".
  - Se borra `specs/game-jam/frogger/` (el SPEC JAM promovido). `specs/game-jam/paso-de-ranas/` no se toca.

**Out of scope (for future specs):**

- Tortugas que se sumergen, cocodrilos, serpientes en la mediana, moscas bonus y la rana acompañante.
- Vida extra por puntuación.
- Aleatoriedad en los carriles y patrones distintos por nivel.
- Animación del salto (el salto es instantáneo).
- Sonido.
- Gestos táctiles (deslizar para saltar), autorrepetición de la cruceta y gamepads físicos.
- Portada propia `cover-frogger` y textos nuevos.
- Redirigir `/juegos/ranaria` a `/juegos/frogger`.
- Extraer un hook común a los componentes de canvas.
- Antitrampas o verificación de la puntuación en servidor.
- Cambios en el layout móvil del reproductor (si `mobile-porter` encuentra algo, va en su propio spec).

## Data model

No hay tablas nuevas. La migración cambia una fila de `games`.

**Migración** `supabase/migrations/<timestamp>_convert_ranaria_to_frogger.sql` (con `npx supabase migration new convert_ranaria_to_frogger`):

- `UPDATE public.games` donde `code = 'ranaria'`: `code = 'frogger'`, `title = 'FROGGER'`, `playable = true`.
- No toca `short_desc`, `long_desc`, `category_id`, `cover`, `color` ni `sort_order` (8).
- `ranaria` nunca fue `playable`, así que no tiene filas en `scores` que migrar.

**API pública del motor** (`lib/games/frogger/engine.ts`):

```ts
export interface FroggerStats {
  score: number;
  lives: number; // empieza en 3
  level: number; // empieza en 1, +1 por cada 5 nenúfares llenos
}

export interface FroggerCallbacks {
  onStats: (stats: FroggerStats) => void; // solo cuando cambia la puntuación, las vidas o el nivel
  onGameOver: (finalScore: number) => void; // 1 s después de perder la última vida
}

export interface FroggerGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: detiene el motor sin llamar a onGameOver
  restart(): void; // estado inicial y vuelta a ready
  destroy(): void; // cancela el requestAnimationFrame y quita los listeners
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
): FroggerGame;
```

Fases internas del motor:

```ts
type Phase = "ready" | "playing" | "dying" | "gameover" | "ended";
```

Convenciones:

- `ready`: se dibujan los carriles en su posición inicial, la rana en la salida y la barra llena, todo quieto. El motor ignora el teclado.
- `playing`: `start()` pone en marcha los carriles y el tiempo.
- `dying`: 1 s tras una muerte con vidas restantes. Los carriles siguen moviéndose, el tiempo no corre y se ignoran los saltos. Al terminar, rana nueva en la salida y vuelta a `playing`.
- `gameover`: al perder la última vida. La escena se queda congelada 1 s sin aceptar teclas, y después se llama a `onGameOver` una sola vez.
- `ended`: tras FIN no se actualiza nada ni se llama a `onGameOver`.
- La pausa es un flag aparte de la fase. En pausa no se actualiza nada ni se aceptan saltos, y `lastTime` se reinicia al reanudar para que no haya salto de tiempo.
- `dt` está limitado a 50 ms. A la velocidad máxima (150 × 2.05 ≈ 308 px/s) un objeto avanza como mucho 16 px por frame, menos que la caja de la rana (28), así que no hay túneles.
- Orden de cada frame en `playing`: mover carriles, arrastrar la rana si está en el río, comprobar colisión/agua/borde, descontar tiempo. Los saltos se aplican en el `keydown` y comprueban colisión, agua y nenúfares al momento.
- Input: listener en `window` que lee solo `e.code`, nunca `e.key` ni `e.isTrusted` (el gamepad emite eventos sintéticos con `code`). Un salto por `keydown` sin `repeat`, solo en `playing` y sin pausa. No hay estado de teclas mantenidas, así que no hay nada que limpiar al pausar.
- `preventDefault` en las flechas y en Espacio, solo en `ready` y `playing`, y nunca con el foco en un `input` o `textarea`. `W` `A` `S` `D` no necesitan `preventDefault`, pero tampoco hacen nada con el foco en un campo de texto. El Espacio no tiene acción en el motor.
- `P`, `Esc`, empezar (Espacio o toque) y la auto-pausa los gestiona el componente de React, no el motor.

**Constantes** (`lib/games/frogger/constants.ts`): tamaño lógico 800×600, celda de 40, 20×15 filas y columnas, filas de cada zona (orilla 0, nenúfares 1, río 2–6, mediana 7, carretera 8–12, salida 13, tiempo 14), salida de la rana (`x = 400`, fila 13), caja de la rana (28), alto de coche (28), centros de los nenúfares (80, 240, 400, 560, 720), ancho del nenúfar (48) y tolerancia (16), tabla de carriles (fila, tipo, sentido, velocidad base, ancho, separación, color), fórmula de velocidad (+0.15 por nivel, máximo 2.05), 30 s por rana, puntos (10 por fila nueva, 50 + 10 por segundo en el nenúfar, 1 000 por ronda completa), máximo de puntuación (10 000 000), 3 vidas, 1 s de muerte, 1 s de game over, límite de `dt` (50 ms) y colores (`#00ff88`, `#00f5ff`, `#f5ff00`, `#ff006e`, `#ff4fd8`, `#041a33`, `#0d0d1a`, `#15151f`, `#2a2a40`).

**Archivos:**

| Archivo                                                          | Cambio                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_convert_ranaria_to_frogger.sql` | Nuevo: `UPDATE` de `ranaria` a `frogger`                                                                                                 |
| `lib/supabase/database.types.ts`                                 | Regenerado con `npm run db:types` (no se esperan cambios de tipos)                                                                       |
| `lib/games/frogger/constants.ts`                                 | Nuevo: tablero, zonas, rana, nenúfares, tabla de carriles, tiempos, puntos, vidas y colores                                              |
| `lib/games/frogger/engine.ts`                                    | Nuevo: `createFroggerGame`: estado, bucle, saltos, carriles, arrastre, colisiones, nenúfares, tiempo, niveles, fases, dibujo y callbacks |
| `components/games/frogger-canvas.tsx`                            | Nuevo: Client Component que monta el canvas y el motor, y dibuja el overlay de inicio con las pistas de teclado y táctil                 |
| `components/games/registry.ts`                                   | Añade la entrada `frogger` con su mapeo `touch`                                                                                          |
| `references/templates/implemented-games.md`                      | Fila y sección de FROGGER                                                                                                                |
| `references/templates/game-suggestions-todo.md`                  | RANARIA pasa a Implementados como FROGGER                                                                                                |
| `CLAUDE.md`                                                      | Specs 01–12, cinco juegos reales y siguiente spec `13-...`                                                                               |
| `specs/game-jam/frogger/spec.md`                                 | Borrado (promovido a este spec)                                                                                                          |

La rana, los carriles y los nenúfares son objetos planos y funciones puras, así que no hay `entities.ts`. Viven en `engine.ts`.

## Implementation plan

1. **Migración.** Crear `convert_ranaria_to_frogger` y aplicarla con `npx supabase db push`. Revisar `get_advisors` de seguridad y ejecutar `npm run db:types`.
   - Resultado: FROGGER aparece en octava posición en la biblioteca y como pestaña del Salón, con las URLs `/juegos/frogger`. No sale en la Home, que solo muestra los 6 primeros.
   - Su reproductor sigue con la simulación y el modal dice "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES", porque todavía no está en el registry.
2. **Constantes.** Crear `lib/games/frogger/constants.ts` según el modelo de datos, con la tabla de carriles tipada. Todavía no se usa.
3. **Motor.** Crear `lib/games/frogger/engine.ts` con `createFroggerGame` según el modelo de datos: estado, bucle con `requestAnimationFrame`, saltos por `e.code`, carriles circulares, arrastre en el río, colisiones, nenúfares, tiempo, puntuación, niveles, vidas, fases, dibujo y callbacks. Todavía no se usa.
4. **Componente y registry.** Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`. Crear `components/games/frogger-canvas.tsx` con la estructura de `snake-canvas.tsx`: `ResizeObserver` con DPR máximo 2, handle `end`/`restart`, `useEffectEvent`, overlay "FROGGER" con `av-hint-keys` y `av-hint-touch`, inicio con Espacio o toque no-mouse, `P`/`Esc` y auto-pausa. Añadir `frogger` a `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: 3, level: 1 }` y el mapeo `touch` del Scope.
   - Resultado: `/juegos/frogger/jugar` se juega de principio a fin con teclado y con el gamepad táctil. El HUD muestra puntuación, vidas y nivel.
5. **Verificación del flujo completo.** Comprobar PAUSA, FIN, muerte con 1 s de animación, game over con 1 s de espera, el modal, GUARDAR PUNTUACIÓN con `submitScore`, JUGAR DE NUEVO y el gamepad en el modo dispositivo de DevTools, y corregir lo que falle. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
6. **Documentación.** Actualizar `references/templates/implemented-games.md`, `references/templates/game-suggestions-todo.md` y `CLAUDE.md` según el Scope, y borrar `specs/game-jam/frogger/`.

## Acceptance criteria

- [x] `supabase/migrations/` contiene `convert_ranaria_to_frogger`, y `npx supabase migration list` la muestra aplicada en local y en remoto.
- [x] En `games` ya no existe `ranaria`. La fila `frogger` tiene `title = 'FROGGER'`, `playable = true`, categoría `arcade`, `cover-rana`, `green`, `sort_order` 8 y los textos que tenía RANARIA. Las demás filas no cambian.
- [x] Los advisors de seguridad no muestran avisos nuevos.
- [ ] FROGGER aparece en octava posición en `/juegos` y como pestaña del Salón de la Fama, con la portada `cover-rana`.
- [x] `/juegos/ranaria` da 404.
- [x] `/juegos/frogger/jugar` muestra el río, la mediana, la carretera, los 5 nenúfares vacíos, la rana en la salida y la barra de tiempo llena, bajo el texto "PULSA ESPACIO PARA EMPEZAR". Nada se mueve hasta pulsar Espacio.
- [x] Al pulsar Espacio, los 10 carriles se mueven en los sentidos de la tabla y la barra de tiempo empieza a bajar.
- [x] Cada pulsación de flecha o de `W` `A` `S` `D` mueve la rana exactamente una casilla (40 px). Mantener la tecla pulsada no repite el salto.
- [x] `↓` en la salida no mueve la rana, y `←`/`→` no la sacan del canvas.
- [ ] Cada salto a una fila no alcanzada antes por esa rana suma exactamente 10 puntos. Volver a una fila ya alcanzada (bajar y subir) no suma.
- [x] Tocar un coche o un camión resta 1 vida y la rana se ve como una X magenta durante 1 s mientras los carriles siguen moviéndose.
- [ ] Saltar al río fuera de un tronco o de unas tortugas resta 1 vida.
- [ ] Sobre un tronco o unas tortugas la rana se desplaza con ellos. Si el arrastre saca su centro del canvas, pierde 1 vida.
- [x] Llegar a un nenúfar libre con 22 s enteros restantes suma exactamente 50 + 220 = 270 puntos, deja una rana dibujada en ese nenúfar y pone una rana nueva en la salida con la barra llena.
- [ ] Saltar contra el seto entre nenúfares o contra un nenúfar ocupado resta 1 vida.
- [x] Si la barra de tiempo llega a 0, se pierde 1 vida y la rana nueva vuelve a tener 30 s.
- [ ] Ocupar el quinto nenúfar suma además exactamente 1 000 puntos, vacía los 5 nenúfares, el NIVEL del HUD pasa a 02 y los carriles van un 15 % más rápido.
- [ ] Del nivel 8 en adelante la velocidad de los carriles ya no aumenta.
- [x] Al perder la tercera vida, la escena se ve congelada 1 s y después se abre "FIN DEL JUEGO" con la puntuación final.
- [x] El HUD muestra la puntuación, las vidas y el nivel del motor.
- [x] El canvas no dibuja puntuación, vidas, nivel, PAUSA ni GAME OVER. Solo dibuja la barra de tiempo como información del juego.
- [x] PAUSA, `P` y `Esc` congelan el juego (carriles y tiempo) y muestran "EN PAUSA". REANUDAR, `P` y `Esc` lo reanudan sin saltos de posición ni de tiempo. Las flechas pulsadas durante la pausa no mueven la rana.
- [ ] Cambiar de pestaña o de ventana durante una partida la deja en EN PAUSA.
- [x] FIN a mitad de partida detiene el juego y abre el modal con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` para `frogger`. Después, `/juegos/frogger` muestra Partidas, Mejor global y el jugador en el ranking, y `/salon-de-la-fama?juego=frogger` lo muestra.
- [x] JUGAR DE NUEVO deja la puntuación en 0, VIDAS en 3, el nivel en 01, los nenúfares vacíos, los carriles en su posición inicial y la rana en la salida, y vuelve a mostrar la pantalla de inicio.
- [ ] En el modo dispositivo de DevTools con táctil se ve "TOCA PARA EMPEZAR", y tocar la pantalla o A empieza la partida.
- [ ] Con el gamepad táctil, cada toque de ◀ ▲ ▶ ▼ hace exactamente un salto en esa dirección, y mantenerlo pulsado no repite el salto. B se ve atenuado y la partida se puede jugar entera solo con el gamepad.
- [x] Un clic de ratón sobre la pantalla de inicio no empieza la partida.
- [ ] Durante la partida, las flechas y Espacio no hacen scroll de la página. En el modal, el campo de iniciales acepta espacios, flechas, `W` `A` `S` `D` y cualquier otra tecla.
- [x] Tras salir con SALIR o VOLVER AL VAULT, las teclas no hacen nada en otras pantallas y no hay errores en la consola.
- [ ] Entrar y salir del reproductor varias veces no acelera los carriles ni el tiempo.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y ocupa todo el `.crt-screen`, también a 375 px de ancho.
- [ ] Asteroids, Tetris, Arkanoid y Snake se siguen jugando exactamente igual, con teclado y con su mapeo táctil.
- [ ] En un mock (p. ej. GLOTÓN) se ve la simulación y el modal "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- [x] `implemented-games.md` tiene la fila y la sección de FROGGER, `game-suggestions-todo.md` lista FROGGER en Implementados y ya no en Ideas en reserva, y `CLAUDE.md` habla de cinco juegos reales y del siguiente spec `13-...`.
- [x] `specs/game-jam/frogger/` ya no existe y `specs/game-jam/paso-de-ranas/` sigue igual.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** promover el SPEC JAM `specs/game-jam/frogger/spec.md` como base. Decisión del usuario: no hay referencia del juego en `references/started-games/` y el jam ya lo diseñaba desde cero con el nivel de detalle de los SPEC 07–09.
- **No:** rediseñar todas las mecánicas desde cero. Repetiría trabajo ya hecho y revisado.
- **Yes:** actualizar el spec del jam a los SPEC 10 y 11 (mapeo `touch`, "TOCA PARA EMPEZAR", entrada solo por `e.code`). Es obligatorio para cualquier juego real desde el SPEC 10: `touch` es un campo requerido del registry.
- **Yes:** borrar `specs/game-jam/frogger/` en el paso de documentación. Decisión del usuario: este spec lo cita como origen y así no quedan dos specs del mismo juego.
- **No:** marcarlo `Obsolete` o dejarlo como está.
- **Yes:** convertir el mock RANARIA en `frogger` con título `FROGGER`. Decisión del usuario, igual que CAÍDA → TETRIS, BLOQUE BUSTER → ARKANOID y SERPENTINA → SNAKE, aceptando que `/juegos/ranaria` pase a dar 404.
- **No:** conservar `code = ranaria`. **No:** fila nueva con RANARIA como mock, que dejaría dos Frogger en el catálogo.
- **Yes:** mantener `arcade`, `cover-rana`, `green`, `sort_order` 8 y los textos. Ya describen el juego y no hay que desplazar filas.
- **Yes:** Frogger clásico mínimo. Decisión del usuario: coches, troncos y tortugas fijas, 5 nenúfares, 30 s por rana, 3 vidas y +15 % de velocidad por ronda con tope en el nivel 8.
- **No:** tortugas que se sumergen, mosca bonus y cocodrilos. Son mecánicas extra para otro spec.
- **Yes:** tablero de 20×15 celdas de 40 px. Cubre los 800×600 sin márgenes, deja 5 carriles de río y 5 de carretera como el original, y reserva la fila de abajo para la barra de tiempo.
- **Yes:** carriles circulares deterministas, sin aleatoriedad. Como el arcade, el patrón se aprende y la habilidad se nota en la puntuación.
- **Yes:** puntos por fila nueva y bonus de tiempo solo al llegar al nenúfar. No se puede inflar la puntuación subiendo y bajando ni esperando, como recomendaba `game-suggestions-todo.md`.
- **No:** multiplicar los puntos por el nivel. La velocidad ya premia llegar lejos y la puntuación sigue siendo fácil de comprobar.
- **Yes:** tope de velocidad ×2.05. Evita túneles con `dt` de 50 ms y deja la dificultad máxima jugable.
- **Yes:** 3 vidas y 1 s de animación de muerte con el mundo en marcha. Es el comportamiento del arcade y el HUD ya muestra VIDAS.
- **Yes:** 30 s por rana con barra en el canvas. Es información del juego en curso, como la siguiente pieza de Tetris, y el playbook lo permite.
- **Yes:** salto instantáneo de una casilla por pulsación, sin repetición. Precisión total y nada que limpiar al pausar.
- **Yes:** gamepad con la cruceta para saltar sin `repeat`, A para empezar y B sin uso. Decisión del usuario, igual que Snake: un toque es un salto, como una pulsación de tecla.
- **No:** cruceta con autorrepetición, que haría saltar a la rana a ciegas varias casillas. **No:** B como segundo `↑`.
- **Yes:** flechas y `W` `A` `S` `D`, con Espacio para empezar. Igual que Snake.
- **Yes:** título "FROGGER" en `neon-green`. Decisión del usuario: es el color de la fila, como SNAKE.
- **Yes:** escena inicial quieta detrás del overlay y 1 s congelado antes del modal. Igual que los demás juegos.
- **Yes:** migración primero, como en los SPEC 08 y 09: entre pasos, `frogger` no está en el registry y no puede guardar puntuaciones simuladas.
- **Yes:** `PlayerHud`, `game-player.tsx` y `touch-gamepad.tsx` no cambian.
- **Yes:** copiar la estructura de `snake-canvas.tsx` en lugar de extraer un hook común. No se toca código de los otros juegos salvo la entrada del registry.
- **Yes:** no se cambia el leaderboard. La puntuación es un entero creciente, limitado a 10 000 000.
- **Yes:** paso de documentación completo. Decisión del usuario: `CLAUDE.md` pide actualizar `implemented-games.md` al implementar un juego, y el To Do y el estado de `CLAUDE.md` quedarían desfasados.
- **No:** sonido. Ningún juego del portal lo tiene todavía.

## Risks

| Risk                                                                                  | Mitigation                                                                                                                              |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| La rana atraviesa un coche con `dt` grande                                            | `dt` limitado a 50 ms y velocidad con tope ×2.05: como mucho 16 px por frame, menos que la caja de la rana (28).                        |
| La rana arrastrada por un tronco queda desalineada con los nenúfares y parece injusto | Tolerancia de 16 px respecto al centro del nenúfar. Es la dificultad del original y se comprueba a ojo en el paso 5.                    |
| Un carril queda imposible de cruzar (huecos demasiado pequeños o plataformas escasas) | Tabla fija con al menos el 33 % del río cubierto por plataformas. Se prueba en el nivel 1 y en el 8 en el paso 5.                       |
| El motor no responde al gamepad                                                       | Solo se lee `e.code`, nunca `e.key` ni `e.isTrusted`. Hay un criterio de aceptación con el gamepad.                                     |
| En móvil, la rana y los coches se ven pequeños a 375 px                               | El canvas escala 800×600 al `.crt-screen` como los demás juegos. Si `mobile-porter` encuentra problemas, van en su propio spec.         |
| El motor bloquea teclas en el input de iniciales                                      | `preventDefault` solo en `ready` y `playing`, nunca con el foco en un `input` o `textarea`, y el motor no hace nada fuera de `playing`. |
| Bucles o listeners que sobreviven al desmontar (Strict Mode monta dos veces)          | `destroy()` cancela el rAF y quita los listeners. Se prueba entrando y saliendo varias veces.                                           |
| Salto de `dt` o del tiempo al volver de una pausa o de una pestaña oculta             | `dt` limitado a 50 ms, `lastTime` reiniciado al reanudar y el tiempo de la rana solo corre en `playing`.                                |
| Enlaces externos o marcadores a `/juegos/ranaria` dan 404                             | Aceptado por el usuario. La redirección queda fuera de alcance.                                                                         |
| Cambiar `code` con un `UPDATE` deja la página `/juegos/ranaria` en caché              | `npm run build` regenera las rutas. En desarrollo basta con recargar.                                                                   |
| `shadowBlur` en unos 30 objetos en pantalla baja los FPS                              | Glow moderado y solo en los contornos.                                                                                                  |

## What is **not** in this spec

- Tortugas que se sumergen, cocodrilos, serpientes, moscas bonus y rana acompañante.
- Vida extra, carriles aleatorios y patrones por nivel.
- Animación del salto.
- Sonido, gestos táctiles, autorrepetición de la cruceta y gamepads físicos.
- Portada o textos nuevos, y la redirección de `/juegos/ranaria`.
- Cambios en el layout móvil del reproductor.
- Hook común para los componentes de canvas.
- Antitrampas y cambios en el leaderboard.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
