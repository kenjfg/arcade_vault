# SPEC 02 — Home (landing) de Arcade Vault

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-28
> **Objective:** Portar a `/` la landing de `references/templates/home-about/home.jsx` con fidelidad visual exacta, moviendo la Biblioteca a `/juegos` y añadiendo el link "Inicio" al nav.

## Scope

**In:**

- Nueva pantalla Home en `/` (`app/page.tsx`), port exacto de `home.jsx` con sus siete bloques:
  - Hero: silos pixelados flotantes (8 SVG), eyebrow "▸ INSERTA UNA MONEDA_", título de tres líneas, subtítulo, CTAs "EXPLORAR JUEGOS" y "CREAR CUENTA", indicador "DESLIZA ▼".
  - `// 01` ¿Por qué Arcade Vault?: cuatro feature cards con iconos pixel (`GAMEPAD`, `FREE`, `TROPHY`, `ROCKET`).
  - `// 02` Juegos disponibles ahora: rail con los 6 primeros juegos de `GAMES` + botón "VER TODOS LOS JUEGOS →".
  - Franja de estadísticas ("12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING").
  - `// 03` Actividad en vivo: ticker "Últimas puntuaciones" (7 filas) y "Top jugadores · hoy" (5 filas con barra) + botón "VER SALÓN →".
  - `// 04` Precios: tarjeta "JUGADOR VAULT $0 / SIEMPRE" con sello "FREE PLAY" y tres FAQ.
  - CTA final "¿LISTO PARA JUGAR?" / "INSERTAR MONEDA →".
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in` con `IntersectionObserver`, umbral 0.12), igual que `useReveal` de la referencia.
- Mover la Biblioteca de `/` a `/juegos` (`app/juegos/page.tsx`), sin cambios en su contenido.
- Actualizar destinos que hoy apuntan a `/` como Biblioteca:
  - "VOLVER AL VAULT" (detalle), "VOLVER A LA BIBLIOTECA" (salón) y "Volver a la biblioteca" del modal del reproductor → `/juegos`.
  - Redirección tras iniciar sesión y tras entrar como invitado → `/juegos`.
  - Redirección tras cerrar sesión → `/` (Home).
- Nav: nuevo link "Inicio" (`/`) en desktop y menú móvil, antes de "Biblioteca"; "Biblioteca" pasa a `/juegos`; el logo lleva a `/`.
- Port a `app/globals.css` de los estilos del Home desde `references/templates/home-about/styles.css`: bloques `HOME PAGE` (incluye `.reveal` y keyframes `float`/`bounce`), `ACTIVITY (leaderboard + ticker)` y `PRICING`.

**Out of scope (for future specs):**

- Pantalla "Acerca de" (`about.jsx`) y su link en el nav.
- Datos reales en el Home: actividad, top jugadores y estadísticas derivados de `GAMES`, `seededScores` o `av_scores`.
- Abrir `/iniciar-sesion` directamente en la pestaña "Crear cuenta".
- Soporte de `prefers-reduced-motion` y cualquier otra mejora de accesibilidad.
- Estilos de la referencia que no usa `home.jsx` (about, gamepad, theme variants, score floaters).

## Data model

No introduce datos nuevos ni persistencia. El contenido de actividad, top jugadores, estadísticas, features y FAQ son constantes estáticas calcadas de `home.jsx`, declaradas en `app/page.tsx`. El rail de juegos reutiliza `GAMES` de `lib/games-data.ts` (`GAMES.slice(0, 6)`).

## Implementation plan

1. Portar a `app/globals.css`, dentro de las capas de Tailwind como el resto del tema, los bloques `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css`, sin tocar las reglas existentes. La app se ve igual que antes.
2. Crear los componentes del Home en `components/`: `floating-silhouettes.tsx` (8 silos SVG), `feature-icon.tsx` (4 iconos pixel), `mini-card.tsx` (tarjeta del rail, con `Link` a `/juegos/[id]`) y `reveal-on-scroll.tsx` (Client Component que registra el `IntersectionObserver` sobre `.reveal` al montar y lo desconecta al desmontar). Aún no se usan.
3. Crear `app/juegos/page.tsx` con el contenido actual de la Biblioteca. Apuntar a `/juegos` los tres botones de "volver", las redirecciones de login e invitado en `app/iniciar-sesion/page.tsx` y el link "Biblioteca" del nav (activo en `/juegos` y `/juegos/*`). `/` sigue mostrando la Biblioteca temporalmente.
4. Reemplazar `app/page.tsx` por el Home (Server Component con `<RevealOnScroll />`), con los siete bloques y la navegación de la referencia vía `Link`: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" → `/juegos`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/iniciar-sesion`; "VER SALÓN" → `/salon-de-la-fama`; mini cards → `/juegos/[id]`. En el nav: añadir "Inicio" (activo solo en `/`) en desktop y móvil, logo → `/`, y cerrar sesión → `/`.
5. QA visual comparando `/` contra `references/templates/home-about/arcade-vault-standalone.html` en desktop y a 375px de ancho (espaciados, neón, silos, hover de mini cards y feature cards, reveal, breakpoints), y verificación de `npx tsc --noEmit` y `npm run lint`.

## Acceptance criteria

- [x] `/` muestra el Home con los siete bloques en el orden y con los textos exactos de `home.jsx`.
- [x] El hero muestra los 8 silos flotando y los botones "EXPLORAR JUEGOS" (pulse) y "CREAR CUENTA" (magenta).
- [x] Las secciones marcadas `.reveal` empiezan ocultas y aparecen al entrar en el viewport, con el retardo escalonado de las cards.
- [x] El rail muestra los 6 primeros juegos de `GAMES`, y cada mini card navega a `/juegos/[id]` de ese juego.
- [x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/juegos`; "CREAR CUENTA" y "EMPEZAR GRATIS →" a `/iniciar-sesion`; "VER SALÓN →" a `/salon-de-la-fama`.
- [x] Las puntuaciones del ticker y del top se muestran con formato `es-ES` (ej. `+184.220`, `312.840`).
- [x] `/juegos` muestra la Biblioteca con buscador y chips de categoría funcionando, igual que antes en `/`.
- [x] "VOLVER AL VAULT" (detalle), "VOLVER A LA BIBLIOTECA" (salón) y "Volver a la biblioteca" (modal del reproductor) llevan a `/juegos`.
- [x] Iniciar sesión o entrar como invitado redirige a `/juegos`; cerrar sesión redirige a `/`.
- [x] El nav (desktop y móvil) muestra "Inicio" antes de "Biblioteca"; "Inicio" está activo solo en `/`, y "Biblioteca" en `/juegos`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- [x] Hacer clic en el logo lleva a `/`.
- [x] Los breakpoints de la referencia se cumplen: feature grid 4 → 2 → 1 columnas, rail 6 → 3 → 2, actividad en una columna bajo 900px, y sin scroll horizontal a 375px.
- [x] No aparece el link "Acerca de" en el nav ni existe la ruta `/acerca-de`.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.

## Decisions

- **Yes:** Home en `/` y Biblioteca en `/juegos`. La landing ocupa la raíz como en el prototipo, y `/juegos` encaja con `/juegos/[id]` ya existentes.
- **No:** Home en `/inicio` dejando la Biblioteca en `/`. La raíz y el logo no llevarían a la landing.
- **No:** Biblioteca en `/biblioteca`. Rompe la jerarquía con `/juegos/[id]`.
- **Yes:** añadir solo "Inicio" al nav. "Acerca de" espera a que su pantalla exista en un spec propio, para no enlazar a un 404.
- **Yes:** datos de actividad, top y estadísticas estáticos y calcados de la referencia, incluido "12+ JUEGOS" aunque `GAMES` tenga 8. Es lo que pide "exactamente igual" y no añade lógica.
- **No:** derivar esos datos de `seededScores`/`av_scores`. Cambia el resultado visual respecto a la referencia; queda para otro spec.
- **Yes:** los botones de "volver a la biblioteca" apuntan a `/juegos`. Conservan su significado actual.
- **Yes:** login e invitado redirigen a `/juegos` y logout a `/`. Quien entra quiere jugar; quien sale vuelve a la landing.
- **Yes:** "CREAR CUENTA" enlaza a `/iniciar-sesion` sin elegir pestaña, igual que el prototipo. No toca `auth-form.tsx`.
- **No:** soporte de `prefers-reduced-motion`. Ninguna pantalla del SPEC 01 lo tiene; va en un spec de accesibilidad aparte.
- **Yes:** estilos del Home añadidos a `app/globals.css`, solo los bloques que usa `home.jsx`. Sigue la convención del SPEC 01 (un único CSS global portado de la referencia).
- **No:** archivo aparte `app/home.css`. Introduce una convención nueva sin necesidad.
- **Yes:** Home como Server Component, con la lógica de reveal aislada en un Client Component pequeño (`reveal-on-scroll.tsx`). La página no tiene estado propio, y formatear los números en el servidor evita diferencias de hidratación con `toLocaleString`.
- **Yes:** navegación con `Link` de Next.js en lugar de `onClick` + `navigate`, como en el SPEC 01. Conserva las clases y el aspecto de la referencia.
- **Yes:** el `_` del eyebrow no parpadea, porque en la referencia no hay regla CSS que lo anime fuera de `.av-hero .sub`. Calco exacto.
- **Yes:** mover la Biblioteca antes de reemplazar `/` (pasos 3 y 4). Así cada paso deja la app funcional y sin rutas rotas.

## Risks

- **`Link` en lugar de `div`/`button`:** un `<a>` puede heredar color, subrayado o `display` distintos de la referencia (en especial `.mini-card`, `.lb-link` y los `.btn`). Se valida en el QA visual del paso 5.
- **Choque de estilos:** clases genéricas del Home (`.section-title`, `.kicker`, `.stat-block`, `.top-row`) podrían afectar a otras pantallas si ya se usan con otro significado. Hay que revisar que Biblioteca, Detalle, Reproductor, Auth y Salón no cambian tras el paso 1.
- **Reveal y navegación cliente:** si el observer se registra antes de que existan los nodos `.reveal`, o no se desconecta al salir, las secciones podrían quedar invisibles al volver a `/`. `RevealOnScroll` se monta dentro de la página y se desconecta al desmontar.

## What is **not** in this spec

- La pantalla "Acerca de" y su formulario de contacto.
- Datos reales o en vivo en el Home (actividad, ranking, contadores).
- Preselección de la pestaña "Crear cuenta" en `/iniciar-sesion`.
- Accesibilidad de movimiento (`prefers-reduced-motion`).
- Cambios en el contenido de la Biblioteca, el Detalle, el Reproductor, Auth o el Salón más allá de sus enlaces y redirecciones.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
