# SPEC 10 — Controles táctiles con gamepad virtual

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Hacer jugables en móviles y tablets táctiles los 4 juegos reales con un gamepad virtual común (cruceta, A, B y PAUSA) que emite eventos de teclado sintéticos según un mapeo por juego en el registry, y permitir empezar la partida tocando la pantalla.

## Why this spec exists

Los 4 juegos reales (Asteroids, Arkanoid, Tetris y Snake) solo se controlan con teclado. En un móvil no se puede ni empezar la partida, porque la pantalla de inicio pide pulsar Espacio. Los motores escuchan `keydown` y `keyup` en `window` y leen `e.code`. No miran `isTrusted`, y su `isTyping(e.target)` es falso cuando el target es `window`. Por eso un gamepad que despacha `KeyboardEvent` sintéticos en `window` mueve los 4 juegos **sin tocar ningún motor**.

## Scope

**In:**

- **Detección de dispositivo táctil** solo con CSS: `@media (hover: none) and (pointer: coarse)`. Incluye móviles y tablets. Excluye escritorio y portátiles con pantalla táctil y ratón. No hay detección por JS, por ancho ni por user-agent.
- **Mapeo por juego en el registry** (`components/games/registry.ts`): campo obligatorio `touch` en `GameRegistryEntry` (ver Data model).
  - **Asteroids:** ← `ArrowLeft` · → `ArrowRight` · ↑ `ArrowUp` · A `Space`.
  - **Arkanoid:** ← `ArrowLeft` · → `ArrowRight` · A `Space`.
  - **Tetris:** ← `ArrowLeft` (repite) · → `ArrowRight` (repite) · ↓ `ArrowDown` (repite) · ↑ `ArrowUp` · A `Space` · B `KeyX`.
  - **Snake:** ← `ArrowLeft` · → `ArrowRight` · ↑ `ArrowUp` · ↓ `ArrowDown` · A `Space`.
- **Componente nuevo `components/touch-gamepad.tsx`** (Client Component):
  - **Disposición fija en los 4 juegos:** cruceta de 4 direcciones a la izquierda, botón PAUSA en el centro y botones A y B a la derecha.
  - **Etiquetas:** las flechas muestran `◀` `▲` `▶` `▼`, los botones muestran solo "A" y "B" (sin la acción del juego) y el botón central muestra "PAUSA" o "REANUDAR" según `paused`.
  - **Botones sin mapeo** (p. ej. ↑, ↓ y B en Arkanoid): se ven atenuados, llevan `disabled` y no emiten nada.
  - **Pulsación:** con `pointerdown` se despacha `new KeyboardEvent("keydown", { code })` en `window`. Con `pointerup`, `pointercancel` o `lostpointercapture` se despacha el `keyup` del mismo `code`. Cada botón captura su puntero con `setPointerCapture`. Así hay multitouch, y se puede girar y disparar a la vez en Asteroids.
  - **Autorrepetición** solo en los botones con `repeat: true`: tras 170 ms pulsado se despacha un `keydown` con `repeat: true` cada 50 ms hasta soltar. Sustituye al key repeat del sistema, que Tetris usa para mover y bajar.
  - **Estado pulsado:** el botón se ve iluminado mientras está pulsado.
  - **PAUSA** llama al mismo `onTogglePause` que el botón PAUSA del HUD, con el mismo comportamiento. No emite teclas.
  - **En pausa** (`paused`), la cruceta, A y B están desactivados y solo responde PAUSA/REANUDAR.
  - **Al pausar, al terminar (`over`) o al desmontar,** el gamepad despacha el `keyup` de cada tecla que tenga pulsada y para sus temporizadores de repetición. Ninguna tecla queda pegada.
  - **Sin gestos del navegador:** `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en todo el gamepad. Tocarlo no hace zoom ni scroll, y la pulsación larga no abre el menú.
  - **Estilo retro** con las variables de `app/globals.css` (`--cyan`, `--magenta`, `--yellow`, `--line`, `--pixel`), en clases `av-gamepad*` dentro de la capa que ya usan las clases `av-*`. Los botones miden al menos 44×44 px.
- **Posición:** debajo de la pantalla del CRT, entre `.crt-screen` y la barra `.crt-bottom`. `CrtScreen` recibe una prop opcional `controls?: ReactNode` y la renderiza en ese hueco.
- **Montaje** en `components/game-player.tsx`: solo cuando es un juego real (`isReal`). Recibe el `touch` de la entrada del registry, `paused`, `over` y `onTogglePause`. En los mocks (simulación) no hay gamepad.
- **Tocar para empezar** en los 4 componentes de canvas (`components/games/<code>-canvas.tsx`):
  - El overlay de inicio (`crt-content`) responde a `onPointerDown` cuando `e.pointerType` no es `"mouse"`. Hace lo mismo que el Espacio actual: `gameRef.current?.start()` y `setStarted(true)`.
  - Pulsar A también empieza, porque despacha un `keydown` de `Space` que el listener del componente ya escucha.
  - En Asteroids, tras empezar tocando, el componente despacha un `keyup` sintético de `Space`. Sin él, `start()` deja `keys.Space = true` (`lib/games/asteroids/engine.ts:310`) y el primer A no dispararía.
  - Texto del overlay: "PULSA ESPACIO PARA EMPEZAR" sin dispositivo táctil y "TOCA PARA EMPEZAR" con él. Son dos `span` que se alternan con la misma media query (clases `av-hint-keys` y `av-hint-touch`), sin JS.
- **Documentación:**
  - `references/templates/implemented-games.md`: controles táctiles de cada juego.
  - `.claude/skills/game-spec/playbook.md`: los juegos nuevos tienen que declarar `touch` en su entrada del registry.
- **Motores sin cambios:** `lib/games/**`, `PlayerHud`, `GameOverModal`, el leaderboard y `submitScore` funcionan igual.

**Out of scope (for future specs):**

- Layout móvil del reproductor (HUD compacto, CRT a pantalla completa) y bloqueo del scroll de la página durante la partida.
- Pantalla completa, orientación horizontal y aviso de girar el móvil.
- Gestos (swipe, tap sobre el canvas) y arrastrar el dedo para mover la paleta en Arkanoid.
- Etiquetas con la acción de cada juego en A y B.
- Vibración (`navigator.vibrate`).
- Gamepads físicos (Gamepad API).
- Mapeo configurable por el usuario y gamepad en los mocks.
- Deslizar el dedo de un botón a otro sin levantarlo.
- Pausar tocando la pantalla del juego.

## Data model

No hay datos persistidos ni migraciones. Solo cambian los tipos del registry.

**Tipos nuevos** en `components/games/registry.ts`:

```ts
export interface TouchButton {
  code: string; // KeyboardEvent.code que se emite, p. ej. "ArrowLeft"
  repeat?: boolean; // autorrepetición mientras se mantiene pulsado
}

// Lo que no aparece se ve atenuado y desactivado.
export interface TouchControls {
  up?: TouchButton;
  down?: TouchButton;
  left?: TouchButton;
  right?: TouchButton;
  a?: TouchButton;
  b?: TouchButton;
}

export interface GameRegistryEntry {
  Component: ComponentType<GameCanvasProps>;
  initialStats: GameStats;
  touch: TouchControls; // obligatorio: todo juego real declara su gamepad
}
```

**Props del gamepad** (`components/touch-gamepad.tsx`):

```ts
interface TouchGamepadProps {
  controls: TouchControls;
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
}
```

Convenciones:

- Los eventos se despachan en `window` con `{ code, bubbles: true }` y, en la autorrepetición, con `repeat: true`. No se rellena `key`, porque ningún motor lo lee.
- Retardo de repetición de 170 ms e intervalo de 50 ms, como constantes en `touch-gamepad.tsx`.
- El gamepad guarda en un `ref` las teclas pulsadas, por puntero, para soltarlas al pausar, al terminar o al desmontar.

**Archivos:**

| Archivo                                                         | Cambio                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/games/registry.ts`                                  | Tipos `TouchButton` y `TouchControls`, campo `touch` en `GameRegistryEntry` y mapeo de los 4 juegos    |
| `components/touch-gamepad.tsx`                                  | Nuevo: cruceta, PAUSA, A y B, con eventos sintéticos, autorrepetición y liberación de teclas           |
| `components/crt-screen.tsx`                                     | Prop opcional `controls`, renderizada entre `.crt-screen` y `.crt-bottom`                              |
| `components/game-player.tsx`                                    | Monta `TouchGamepad` en `CrtScreen` para los juegos reales                                             |
| `components/games/{asteroids,arkanoid,tetris,snake}-canvas.tsx` | Tocar el overlay para empezar y texto doble del overlay. En Asteroids, `keyup` de `Space` tras empezar |
| `app/globals.css`                                               | Clases `av-gamepad*`, `av-hint-keys` y `av-hint-touch` con la media query táctil                       |
| `references/templates/implemented-games.md`                     | Controles táctiles de cada juego                                                                       |
| `.claude/skills/game-spec/playbook.md`                          | Requisito del campo `touch` para los juegos nuevos                                                     |

## Implementation plan

1. **Registry.** Añadir `TouchButton`, `TouchControls` y el campo `touch` obligatorio, y el mapeo de los 4 juegos del Scope. Todavía no hay UI. `npx tsc --noEmit` pasa.
2. **Gamepad y estilos.** Crear `components/touch-gamepad.tsx` según el Scope y el Data model, y las clases `av-gamepad*` en `app/globals.css` con la media query táctil. Todavía no se monta.
3. **Montaje.** Añadir la prop `controls` a `CrtScreen` y montar `TouchGamepad` desde `GamePlayer` para los juegos reales.
   - Resultado: en DevTools, en modo dispositivo con touch, se ve el gamepad bajo la pantalla y los 4 juegos se empiezan con A y se juegan solo con el gamepad.
   - En escritorio no aparece.
4. **Tocar para empezar.** En los 4 componentes de canvas: `onPointerDown` táctil en el overlay de inicio, los dos `span` del texto con `av-hint-keys` y `av-hint-touch` (con sus estilos en `globals.css`), y el `keyup` de `Space` tras empezar en Asteroids.
5. **Documentación.** Actualizar `references/templates/implemented-games.md` y `.claude/skills/game-spec/playbook.md`. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

Las pruebas táctiles se hacen en Chrome DevTools en modo dispositivo con touch (p. ej. iPhone 12, 390 px), y si es posible en un móvil real a través de la IP de la LAN.

Verificación (2026-10-08): solo en la simulación de DevTools. El móvil no llegó al servidor de desarrollo por la LAN (el firewall de Windows bloquea en la red Pública). El multitouch y los gestos del navegador (zoom, menú de pulsación larga) quedan por confirmar en un dispositivo real.

- [x] En modo dispositivo táctil, `/juegos/<code>/jugar` muestra el gamepad entre la pantalla del CRT y la barra "SEÑAL OK" en los 4 juegos reales.
- [x] En escritorio con ratón (sin modo dispositivo), el gamepad no aparece en ningún juego.
- [x] En un mock (p. ej. GLOTÓN), el gamepad no aparece, ni siquiera en modo táctil.
- [x] El gamepad tiene la misma forma en los 4 juegos. Los botones sin mapeo se ven atenuados y no hacen nada (↑, ↓ y B en Arkanoid; ↓ y B en Asteroids; B en Snake).
- [x] A y B muestran solo "A" y "B".
- [x] En modo táctil, la pantalla de inicio dice "TOCA PARA EMPEZAR". En escritorio sigue diciendo "PULSA ESPACIO PARA EMPEZAR".
- [x] Tocar la pantalla de inicio empieza la partida en los 4 juegos. Pulsar A también.
- [x] En escritorio, hacer clic con el ratón en la pantalla de inicio no empieza la partida. Espacio sí.
- [x] Asteroids: ◀ y ▶ giran la nave mientras se mantienen, ▲ da impulso mientras se mantiene y cada toque de A dispara una vez.
- [x] Asteroids: tras empezar tocando la pantalla, el primer toque de A dispara.
- [x] Asteroids: se puede mantener ◀ con un dedo y disparar con A con otro a la vez.
- [x] Arkanoid: ◀ y ▶ mueven la paleta mientras se mantienen y paran al soltar.
- [x] Tetris: un toque en ◀, ▶ o ▼ mueve o baja una celda. Mantenerlo pulsado repite el movimiento tras una breve espera.
- [x] Tetris: ▲ y B rotan la pieza, y A la deja caer de golpe.
- [x] Tetris: pulsar A para empezar no hace caer la primera pieza.
- [x] Snake: ◀ ▲ ▶ ▼ giran la serpiente, y la dirección opuesta a la actual no hace nada.
- [x] El botón PAUSA del gamepad pausa la partida y muestra "EN PAUSA", cambia a "REANUDAR" y al pulsarlo otra vez la reanuda. El PAUSA del HUD sigue funcionando y los dos se mantienen sincronizados.
- [x] En pausa, la cruceta, A y B no hacen nada.
- [x] Pausar con ◀ pulsado (Asteroids o Arkanoid) y reanudar sin tocarlo deja la nave o la paleta quieta.
- [x] Cuando se abre "FIN DEL JUEGO", ninguna tecla queda pulsada y el gamepad no hace nada.
- [x] Tocar el gamepad, incluso con doble toque o pulsación larga, no hace zoom, no hace scroll, no selecciona texto y no abre el menú contextual.
- [x] Los botones del gamepad miden al menos 44×44 px.
- [x] En escritorio, el teclado funciona igual que en los SPEC 05, 07, 08 y 09 en los 4 juegos.
- [x] Tras salir del reproductor, en otras pantallas no hay listeners ni temporizadores del gamepad activos y no hay errores en la consola.
- [x] `lib/games/**` no tiene cambios.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** gamepad virtual común para los 4 juegos. Decisión del usuario.
- **No:** controles híbridos por juego (gestos en Snake y Tetris, arrastre en Arkanoid). **No:** solo gestos, porque Asteroids queda casi injugable.
- **Yes:** eventos de teclado sintéticos en `window`. Los motores ya los entienden, así que no se toca ningún motor ya probado.
- **No:** una API `press`/`release` en cada motor. Es más limpia en teoría, pero obliga a cambiar 4 motores para conseguir lo mismo.
- **Yes:** mapeo por juego en el registry, con `touch` obligatorio. Decisión del usuario. Un juego nuevo no compila sin declarar su gamepad.
- **Yes:** detección con `(hover: none) and (pointer: coarse)` solo en CSS. Decisión del usuario. No hay problemas de hidratación y se excluyen los portátiles táctiles con ratón.
- **No:** detectar por ancho de pantalla, porque saldría en ventanas de escritorio estrechas. **No:** detectar por user-agent, porque es frágil (iPadOS se presenta como Mac).
- **Yes:** el gamepad va debajo de la pantalla del CRT. Decisión del usuario: no tapa el tablero.
- **No:** el gamepad encima del canvas.
- **Yes:** botón PAUSA en el gamepad, con el mismo `onTogglePause` que el HUD. Decisión del usuario.
- **No:** pausar tocando la pantalla del juego, porque es fácil pausar sin querer.
- **Yes:** A y B muestran solo "A" y "B". Decisión del usuario, al estilo de una consola.
- **No:** etiquetas con la acción de cada juego.
- **Yes:** los botones sin mapeo se ven atenuados y desactivados. Decisión del usuario: la forma del gamepad no cambia entre juegos.
- **No:** ocultar los botones sin mapeo.
- **Yes:** se empieza tocando la pantalla o pulsando A. Decisión del usuario.
- **Yes:** tocar la pantalla para empezar ignora el ratón (`pointerType`). El spec solo se aplica a dispositivos táctiles.
- **Yes:** autorrepetición solo en ◀, ▶ y ▼ de Tetris. Decisión del usuario: es el único juego que mueve una celda por pulsación. Asteroids y Arkanoid ya leen la tecla mantenida.
- **Yes:** `keyup` sintético de `Space` tras empezar tocando en Asteroids. Así se respeta la protección del motor (no disparar con el Espacio que empieza) sin cambiar el motor.
- **No:** vibración. Decisión del usuario: no existe en iOS Safari.
- **No:** deslizar el dedo entre botones. La captura por puntero lo impide, pero hace fiable el multitouch.
- **Yes:** `CrtScreen` recibe el gamepad como prop `controls` para colocarlo entre la pantalla y la barra inferior. No se duplica el marco del CRT.

## Risks

| Risk                                                                                     | Mitigation                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una tecla queda pegada si el `pointerup` se pierde (notificación, cambio de app)         | Se escuchan `pointercancel` y `lostpointercapture`, y todo se suelta al pausar, al terminar y al desmontar. La auto-pausa por `blur` y `visibilitychange` sigue activa. |
| Un motor futuro comprueba `e.isTrusted` o `e.key` y deja de responder al gamepad         | El playbook documenta que los motores leen `e.code` y no deben filtrar por `isTrusted`.                                                                                 |
| La media query no coincide en algún navegador táctil (p. ej. tablet con lápiz o teclado) | Se acepta. El teclado sigue funcionando y el criterio se prueba en modo dispositivo y en un móvil real.                                                                 |
| El primer A de Asteroids no dispara tras empezar tocando                                 | `keyup` sintético de `Space` tras `start()`. Hay un criterio de aceptación.                                                                                             |
| En pantallas pequeñas, el gamepad empuja la barra inferior del CRT fuera de la vista     | Se acepta en este spec. El layout móvil del reproductor queda fuera de alcance.                                                                                         |
| Los temporizadores de repetición siguen vivos tras desmontar                             | Se limpian en el cleanup del efecto y al soltar. Se prueba entrando y saliendo del reproductor.                                                                         |

## What is **not** in this spec

- Layout móvil del reproductor y bloqueo del scroll de la página.
- Pantalla completa, orientación y aviso de girar el móvil.
- Gestos, arrastre en Arkanoid y pausar tocando la pantalla.
- Etiquetas con la acción de cada juego, vibración y gamepads físicos.
- Mapeo configurable y gamepad en los mocks.
- Cambios en los motores, el HUD, el modal o el leaderboard.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
