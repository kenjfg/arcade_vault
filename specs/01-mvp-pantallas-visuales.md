# SPEC 01 — MVP visual de pantallas de Arcade Vault

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-09-28
> **Objective:** Portar al App Router de Next.js las cinco pantallas del prototipo (biblioteca, detalle, reproductor, autenticación y salón de la fama) manteniendo el diseño y la interacción visual de `references/templates/`, sin implementar ningún juego real.

## Scope

**In:**

- Las cinco pantallas del prototipo, como rutas reales de Next.js App Router:
  - `/` — Biblioteca (`biblioteca.jsx`): buscador, chips de categoría, grilla de tarjetas con efecto tilt.
  - `/juegos/[id]` — Detalle (`detalle.jsx`): portada, tags, descripción, stats, tabla de mejores puntuaciones, botones "Jugar ahora" / "Volver al Vault".
  - `/juegos/[id]/jugar` — Reproductor (`reproductor.jsx`): HUD (jugador, puntuación, vidas, nivel), simulación de partida con `setInterval`, pausa, fin de juego, modal para guardar puntuación.
  - `/iniciar-sesion` — Auth (`auth.jsx`): tabs "Iniciar sesión" / "Crear cuenta", botón de invitado, botones sociales decorativos.
  - `/salon-de-la-fama` — Hall of Fame (`salon.jsx`): tabs por juego, podio top 3, tabla completa, fila "tu mejor marca" cuando hay sesión iniciada.
- Nav (`nav.jsx`) y footer, compartidos en `app/layout.tsx`, con menú móvil (hamburguesa) y estado de ruta activa.
- Autenticación simulada: `localStorage` (`av_user`), sin backend.
- Persistencia de puntuaciones guardadas: `localStorage` (`av_scores`), sin backend.
- Port de los datos mock de `data.jsx` (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) a un módulo TypeScript tipado.
- Reemplazo de `app/page.tsx` (plantilla de `create-next-app`) por la pantalla Biblioteca.

**Out of scope (for future specs):**

- Cualquier juego jugable real (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend, base de datos, API o autenticación real (JWT, OAuth con Google/GitHub).
- Sincronización de puntuaciones entre dispositivos o usuarios.
- Sistema de créditos funcional (el contador "CRÉDITOS · 03" del nav queda estático/decorativo).
- Sonido, i18n, y cambio de favicon/branding.

## Data model

Módulo nuevo `lib/games-data.ts`, port de `references/templates/data.jsx`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;
}

export const GAMES: Game[]; // los 8 juegos del prototipo
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión y puntuaciones guardadas, en `lib/auth-context.tsx` y `lib/scores.ts`:

```ts
// localStorage "av_user"
interface AuthUser {
  name: string;
}

// localStorage "av_scores"
interface SavedScore {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}
```

Convenciones:

- `av_user` es `null` cuando no hay sesión (modo invitado), igual que el prototipo.
- `av_scores` es un array que solo crece (sin límite ni deduplicación), igual que el prototipo.

## Implementation plan

1. Crear `lib/games-data.ts` con el port tipado de `GAMES`, `CATS`, `PLAYERS` y `seededScores` desde `data.jsx`.
2. Crear `lib/auth-context.tsx` (Client Component, `AuthProvider` + hook `useAuth`) que lea/escriba `av_user` en `localStorage`, y `lib/scores.ts` con `saveScore`/`getScores` sobre `av_scores`. Envolver `{children}` en `app/layout.tsx` con `<AuthProvider>`.
3. Crear `components/nav.tsx` (port de `nav.jsx`, Client Component) usando `usePathname` para la ruta activa y `useAuth` para el usuario; incluirlo junto con el footer en `app/layout.tsx`.
4. Crear `components/game-card.tsx` (port de `GameCard` con el efecto tilt) y reemplazar `app/page.tsx` por la pantalla Biblioteca (buscador + chips de categoría + grilla), consumiendo `GAMES`/`CATS`.
5. Crear `components/leaderboard.tsx` y `app/juegos/[id]/page.tsx` (pantalla Detalle): portada, tags, descripción, stats, leaderboard vía `seededScores`, botones de navegación. `notFound()` si el `id` no existe en `GAMES`.
6. Crear `components/player-hud.tsx`, `components/crt-screen.tsx`, `components/game-over-modal.tsx` y `app/juegos/[id]/jugar/page.tsx` (pantalla Reproductor, Client Component): simulación de puntuación, pausa, fin de partida, guardado vía `lib/scores.ts`.
7. Crear `components/auth-form.tsx` y `app/iniciar-sesion/page.tsx` (pantalla Auth, Client Component): tabs, invitado, `useAuth().login` + redirección a `/`.
8. Crear `components/hall-podium.tsx`, `components/hall-table.tsx` y `app/salon-de-la-fama/page.tsx` (pantalla Salón de la Fama, Client Component): tabs por juego, podio, tabla, fila "tu mejor marca" cuando hay sesión.
9. Pasada de QA visual comparando cada una de las 5 rutas contra `references/templates/Arcade Vault.html`: espaciados, estados neón, hover/tilt de tarjetas, menú móvil, y limpieza de assets no usados de `create-next-app` (`next.svg`, `vercel.svg` si quedan huérfanos).

## Acceptance criteria

- [ ] `npm run dev` levanta sin errores y `/` muestra la Biblioteca con buscador y chips de categoría funcionando.
- [ ] `/juegos/[id]` muestra portada, tags, descripción, stats y tabla de mejores puntuaciones para cada juego de `GAMES`.
- [ ] Navegar a `/juegos/id-inexistente` responde 404 (`notFound`).
- [ ] `/juegos/[id]/jugar` simula una partida: la puntuación sube sola, "Pausa" detiene el incremento, "Fin" abre el modal de guardado.
- [ ] Guardar la puntuación en el modal la persiste en `localStorage` (`av_scores`) y muestra el estado "guardada".
- [ ] `/iniciar-sesion` permite iniciar sesión, crear cuenta o entrar como invitado; iniciar sesión guarda el usuario en `localStorage` (`av_user`) y redirige a `/`.
- [ ] Con sesión iniciada, el nav muestra el nombre de usuario y permite cerrar sesión; sin sesión muestra "Iniciar Sesión".
- [ ] `/salon-de-la-fama` permite cambiar de juego por pestañas y muestra podio (top 3) + tabla completa; con sesión iniciada añade la fila "tu mejor marca".
- [ ] El menú móvil (hamburguesa) abre/cierra el panel lateral y resalta la ruta activa igual que en el prototipo.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [ ] No existe código de ningún juego jugable real: el reproductor es una simulación visual, tal como en `references/templates/reproductor.jsx`.

## Decisions

- **Yes:** rutas reales de Next.js App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/iniciar-sesion`, `/salon-de-la-fama`) en vez del hash-router de una sola página del prototipo. Sigue las convenciones del App Router y da URLs compartibles.
- **No:** replicar el hash-router (`location.hash` con JSON) del prototipo. Iría contra las convenciones de Next.js que ya sigue este repo.
- **Yes:** rutas y slugs en español, calcando el prototipo. Consistencia con el resto del proyecto (README, textos de UI).
- **Yes:** autenticación simulada con `localStorage` (`av_user`), igual que el prototipo. No hay backend en este MVP visual.
- **No:** backend, JWT u OAuth real. Fuera de alcance de un MVP que es solo la parte visual.
- **Yes:** calcar el simulador de partida del reproductor (`setInterval`, pausa, modal de fin). Mantiene la fidelidad visual e interactiva total con el prototipo.
- **No:** pantalla estática del reproductor sin simulación. Perdería la sensación de "partida" que muestra el prototipo.
- **Yes:** portar `data.jsx` a `lib/games-data.ts` tipado. Reutiliza los datos existentes sin duplicar contenido y da tipos a los componentes.
- **Yes:** componentes de UI compartidos en `components/` en la raíz, usando el alias `@/*` ya configurado. Evita duplicar `Nav`, `GameCard`, etc. entre rutas.
- **Yes:** contador "CRÉDITOS · 03" estático/decorativo en el nav, calcando el prototipo. Es identidad visual retro, no una feature con lógica de negocio.
- **Yes:** reemplazar `app/page.tsx` por la Biblioteca; mantener el `favicon.ico` por defecto de Next. Cambiar el favicon es un detalle de branding fuera de este MVP visual.

## What is **not** in this spec

- Ningún juego jugable real (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel) — el reproductor sigue siendo una simulación visual.
- Backend, autenticación real, base de datos o API — todo el estado vive en `localStorage` del navegador.
- Sistema de créditos funcional, sonido, i18n o soporte táctil avanzado más allá de lo que ya cubre el CSS/Tailwind responsivo.
- Cambiar el favicon o el branding fuera de las pantallas portadas.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
