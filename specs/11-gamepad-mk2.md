# SPEC 11 — Gamepad táctil MK-II

> **Status:** Implemented
> **Depends on:** SPEC 10
> **Date:** 2026-10-09
> **Objective:** Sustituir el aspecto del gamepad táctil del SPEC 10 por el diseño "Gamepad MK-II" de `references/gamepad-assets/gamepad.html`, sin cambiar su comportamiento.

## Why this spec exists

El gamepad del SPEC 10 funciona, pero su aspecto es básico: botones cuadrados con borde y caracteres `◀ ▲ ▶ ▼`. En `references/gamepad-assets/` hay un diseño de mando neón más cuidado (carcasa redondeada, cruceta con relieve y gema central, botones A/B esféricos con brillo). Este spec solo cambia el markup y el CSS de `TouchGamepad`. Los eventos sintéticos, el mapeo del registry y la detección táctil se quedan como están.

## Scope

**In:**

- **Carcasa del mando** (`.av-gamepad`) como la `.gp` de la referencia: cuerpo redondeado con degradado oscuro, borde `--line`, doble borde interior (`::before`), textura de puntos (`::after`) y sombras. Va en el mismo sitio que en el SPEC 10: dentro del marco del CRT, entre `.crt-screen` y `.crt-bottom` ("SEÑAL OK").
- **Disposición:** botón PAUSA/REANUDAR en una fila propia, centrado arriba de la carcasa (como un START). Debajo, la cruceta a la izquierda y A/B a la derecha. Se coloca con CSS grid, sin cambiar el orden del DOM.
- **Cruceta** como la `.gp-dpad` de la referencia: 4 botones con relieve en posición absoluta, flechas en **SVG inline** con los mismos triángulos de la referencia (`fill="currentColor"`) y un hub central decorativo (`aria-hidden`) con la gema cian que late.
- **A y B en fila,** como la referencia: B (cian) a la izquierda y A (magenta) a la derecha, redondos, con la letra en `--pixel`, brillo de su color y el anillo discontinuo (`.ab-ring`) que aparece al pulsar.
- **Botón PAUSA/REANUDAR** con el lenguaje visual MK-II (relieve, borde y brillo en `--yellow`, texto en `--pixel`). Mismo texto y comportamiento que en el SPEC 10.
- **Estado pulsado:** el de `.dp.on` y `.ab.on` de la referencia (hundido, iluminado, anillo visible en A/B), aplicado con el `data-pressed` que ya pone el componente. No se usan `:hover` ni `:active`.
- **Botones sin mapeo y en pausa:** siguen `disabled` y se ven atenuados (`opacity` baja, sin brillo).
- **Tamaños por escalones de ancho**, nunca menos de 44×44 px por botón:
  - **Por defecto** (> 620 px, p. ej. tablets): los de la referencia. Cruceta 156 px con botones de 50 px, A/B de 74 px.
  - **≤ 620 px:** la cruceta de la variante móvil de la referencia (144 px con botones de 46 px) y A/B de 60 px.
  - **≤ 380 px:** un escalón más. Cruceta 132 px con botones de 44 px, A/B de 52 px, y carcasa y huecos más estrechos.
- **Gutters en ≤ 620 px:** el padding lateral de `.av-player` y el padding de `.crt` bajan de 24 px a 12 px. Sin esto, el gamepad no cabe dentro del CRT a 360–390 px (con 24 + 24 px por lado quedan 264 px libres a 360 px).
- **Animaciones:** latido de la gema (`pulse-led`) y transiciones de pulsado como en la referencia. Con `prefers-reduced-motion: reduce` la gema no late.
- **Fuentes y colores** con las variables que ya hay en `app/globals.css` (`--pixel`, `--cyan`, `--magenta`, `--yellow`, `--line`, `--ink-dim`). No se cargan fuentes nuevas.
- **Documentación:** `CLAUDE.md` añade `references/gamepad-assets/` a la sección References como origen del diseño del gamepad.

**Out of scope (for future specs):**

- Cualquier cambio de comportamiento: eventos sintéticos, autorrepetición, multitouch, liberación de teclas, pausa, tocar para empezar.
- Cambios en `components/games/registry.ts`, `TouchControls` o el mapeo de los juegos.
- La media query de detección táctil y su alcance (sigue solo en móviles y tablets).
- Resaltar los botones del gamepad al pulsar el teclado (el `keyMap` de la referencia). En escritorio el gamepad no se ve.
- Deslizar el dedo entre botones.
- Layout móvil del reproductor (más allá de los gutters de ≤ 620 px), pantalla completa y orientación.
- Copiar `gamepad.html` o su PNG dentro de la app.

## Data model

No hay datos nuevos, migraciones ni tipos nuevos. `TouchGamepadProps`, `TouchButton` y `TouchControls` no cambian.

**Clases CSS** (sustituyen a las `av-gamepad*` del SPEC 10, en la misma capa de `app/globals.css`):

| Clase                | Equivale en la referencia | Uso                                           |
| -------------------- | ------------------------- | --------------------------------------------- |
| `.av-gamepad`        | `.gp` + `.gp-body`        | Carcasa: PAUSA arriba, cruceta y A-B debajo   |
| `.av-gamepad-dpad`   | `.gp-dpad`                | Contenedor de la cruceta                      |
| `.av-gamepad-dp`     | `.dp`                     | Botón de dirección (`.up/.down/.left/.right`) |
| `.av-gamepad-hub`    | `.dp-hub` + `.dp-hub-gem` | Centro decorativo con la gema                 |
| `.av-gamepad-ab`     | `.gp-actions`             | Fila de B y A                                 |
| `.av-gamepad-btn-ab` | `.ab` (`.a` / `.b`)       | Botón A o B, con `.av-gamepad-ring`           |
| `.av-gamepad-pause`  | (nuevo)                   | PAUSA / REANUDAR                              |

El estado pulsado sigue siendo `[data-pressed]` y el desactivado `:disabled`.

**Archivos:**

| Archivo                        | Cambio                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `components/touch-gamepad.tsx` | Markup nuevo: carcasa, cruceta con flechas SVG y hub, A/B en fila con anillo. La lógica no cambia |
| `app/globals.css`              | Estilos MK-II de las clases `av-gamepad*`, escalones de tamaño y `prefers-reduced-motion`         |
| `CLAUDE.md`                    | `references/gamepad-assets/` en la sección References                                             |

## Implementation plan

1. **Markup.** En `components/touch-gamepad.tsx`, cambiar solo el JSX: carcasa, cruceta con las flechas SVG de la referencia y el hub, PAUSA (entre la cruceta y A/B en el DOM) y B/A en fila con su `.av-gamepad-ring` y la letra. Mismos handlers, `disabled` y `data-pressed` que ahora. El gamepad sigue funcionando (con el CSS viejo se verá descolocado).
2. **Estilos.** En `app/globals.css`, sustituir los estilos `av-gamepad*` por los de la referencia adaptados a las clases del Data model: carcasa, cruceta, hub y gema, A/B, PAUSA, pulsado, desactivado, escalones ≤ 620 px y ≤ 380 px (con los gutters de `.av-player` y `.crt`) y `prefers-reduced-motion`. La media query táctil y las clases `av-hint-*` no cambian.
   - Resultado: en DevTools en modo dispositivo con touch, el gamepad se ve como `gamepad-neon.png` bajo la pantalla del CRT y los 4 juegos se juegan igual que antes.
3. **Documentación y verificación.** Añadir `references/gamepad-assets/` a References en `CLAUDE.md`. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

Las pruebas se hacen en Chrome DevTools en modo dispositivo con touch, en 360 px, 390 px (iPhone 12) y una tablet (p. ej. iPad, 768 px), y si es posible en un móvil real.

- [x] En modo táctil, el gamepad de los 4 juegos reales tiene la carcasa, PAUSA centrado arriba, y debajo la cruceta con gema y B/A en fila, del diseño MK-II, entre la pantalla del CRT y "SEÑAL OK".
- [x] Las flechas de la cruceta son triángulos SVG y se ven igual en iOS y Android (no como emoji).
- [x] B es cian y está a la izquierda, A es magenta y está a la derecha.
- [x] Al mantener pulsado un botón, se ve hundido e iluminado, y en A/B aparece el anillo discontinuo. Al soltarlo vuelve a su estado normal.
- [x] Los botones sin mapeo (↑, ↓ y B en Arkanoid; ↓ y B en Asteroids; B en Snake) se ven atenuados y no hacen nada.
- [x] En pausa, la cruceta, A y B se ven atenuados y solo responde PAUSA/REANUDAR.
- [x] En 360 px, 390 px y 768 px, el gamepad cabe dentro del marco del CRT sin scroll horizontal ni botones cortados.
- [x] Todos los botones del gamepad miden al menos 44×44 px en los tres anchos.
- [x] La gema late. Con `prefers-reduced-motion: reduce` (emulado en DevTools) no late.
- [x] En escritorio con ratón, el gamepad no aparece.
- [x] En un mock, el gamepad no aparece.
- [x] Todos los criterios de comportamiento del SPEC 10 se siguen cumpliendo en los 4 juegos (multitouch, autorrepetición en Tetris, primer A en Asteroids, sin teclas pegadas al pausar o terminar, sin zoom, scroll ni menú contextual).
- [x] `components/games/registry.ts`, `lib/games/**` y los componentes de canvas no tienen cambios.
- [x] `CLAUDE.md` cita `references/gamepad-assets/` en References.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** solo cambio visual; el comportamiento del SPEC 10 se mantiene. Decisión del usuario. Lo que ya está probado no se toca.
- **Yes:** botón PAUSA/REANUDAR en una fila arriba de la carcasa. Decisión del usuario durante la implementación: entre la cruceta y A/B no cabía a 360–390 px. La referencia no tiene pausa y el SPEC 10 la pide en el gamepad.
- **No:** PAUSA entre la cruceta y A/B (la idea inicial). A 360 px obligaba a botones de 44 px y a un texto de 5 px en PAUSA.
- **Yes:** gutters de `.av-player` y `.crt` a 12 px en ≤ 620 px. Decisión del usuario durante la implementación: es el único modo de que quepa el gamepad con tamaños cercanos a la referencia.
- **No:** dejar los gutters y bajar A/B a 44 px, porque queda muy justo y se aleja de la referencia.
- **No:** pausa en el hub de la cruceta, porque se tocaría sin querer al cambiar de dirección. **No:** quitar la pausa del gamepad.
- **Yes:** carcasa completa del mando. Decisión del usuario.
- **No:** solo los botones sin carcasa.
- **Yes:** A y B en fila como la referencia (B cian a la izquierda, A magenta a la derecha). Decisión del usuario.
- **No:** mantener la diagonal del SPEC 10.
- **Yes:** tamaños por escalones de ancho (referencia, ≤ 620 px y ≤ 380 px). Decisión del usuario. Es legible y se puede comprobar en cada ancho.
- **No:** tamaños fluidos con `clamp()`, porque el CSS es más difícil de leer y de verificar.
- **Yes:** flechas en SVG inline. Decisión del usuario. Algunos móviles pintan `◀ ▲ ▶ ▼` como emoji.
- **Yes:** animaciones de la referencia, con la gema quieta en `prefers-reduced-motion`. Decisión del usuario.
- **Yes:** el estado pulsado usa `data-pressed` en vez de la clase `.on` y de `:active`. El componente ya lo gestiona por puntero, y `:active` no es fiable con `setPointerCapture` en táctil.
- **No:** `:hover` de la referencia. El gamepad solo se ve en dispositivos sin hover.
- **No:** el `keyMap` de teclado de la referencia. En escritorio el gamepad no aparece.
- **Yes:** `references/gamepad-assets/` se queda como referencia y se cita en `CLAUDE.md`. Decisión del usuario. La app no la importa.

## Risks

| Risk                                                                                                  | Mitigation                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| La carcasa y los botones más grandes hacen el gamepad más alto y empujan "SEÑAL OK" fuera de la vista | Se acepta, como en el SPEC 10. El layout móvil del reproductor queda fuera de alcance.                                         |
| El gamepad desborda el marco del CRT en anchos menores de 360 px                                      | El escalón ≤ 380 px está pensado para 360 px. Por debajo se acepta, y queda para el layout móvil.                              |
| Las sombras y el brillo de varios botones pulsados a la vez bajan los FPS en móviles modestos         | Transiciones cortas, solo en `transform`, `box-shadow` y `color`, como la referencia. Se prueba en Tetris con autorrepetición. |
| Al reescribir el JSX se pierde un handler (`onLostPointerCapture`, `disabled`) del SPEC 10            | El paso 1 solo cambia la estructura del markup, y el último criterio repasa el comportamiento del SPEC 10.                     |

## What is **not** in this spec

- Cambios de comportamiento del gamepad, del registry o de los motores.
- Resaltado del gamepad con el teclado y deslizar el dedo entre botones.
- Layout móvil del reproductor, pantalla completa y orientación.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
