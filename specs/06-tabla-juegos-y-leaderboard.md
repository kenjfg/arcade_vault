# SPEC 06 — Tablas de juegos y categorías, y leaderboard en Supabase

> **Status:** Implemented
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-09-30
> **Objective:** Mover el catálogo de juegos y sus categorías a las tablas `games` y `categories` de Supabase y guardar las puntuaciones en una tabla `scores`, de modo que la biblioteca, la Home, el detalle y el Salón de la Fama muestren rankings y estadísticas reales en lugar de `GAMES`, `CATS` y `seededScores`.

## Scope

**In:**

- Una migración versionada en `supabase/migrations/` (Supabase CLI, `npx supabase db push`) que crea:
  - Tabla catálogo `categories` con las 4 categorías actuales (ARCADE, PUZZLE, SHOOTER, VERSUS), en ese orden.
  - Tabla `games` con los 9 juegos actuales (`asteroids` + 8 mocks) sembrados con sus textos, categoría, portada, color y orden actuales. `category_id` es FK a `categories`.
  - Todas las tablas usan `id bigint generated always as identity` como PK. `categories` y `games` tienen además un `code` único en kebab-case (`arcade`, `asteroids`…) que es el que aparece en las URLs.
  - Tabla `scores`, vacía.
  - Vistas `leaderboard` y `game_stats` con `security_invoker = true`.
  - RLS activado en las tres tablas: lectura pública, e inserción anónima en `scores` solo para juegos jugables y con valores válidos.
- `lib/supabase/database.types.ts` regenerado con `npm run db:types`.
- Capa de datos de servidor `lib/games-db.ts` que usa `lib/supabase/server.ts`: `getCategories()`, `getGames()`, `getGame(id)` y `getLeaderboard(gameId, limit)`.
- Biblioteca (`/juegos`), Home (`/`), detalle (`/juegos/[id]`), Salón de la Fama (`/salon-de-la-fama`) y reproductor (`/juegos/[id]/jugar`) leen de Supabase:
  - Las URLs no cambian: el segmento `[id]` de las rutas recibe el `code` del juego (`/juegos/asteroids`), y la página busca por `code`.
  - Cada `page.tsx` es un Server Component que consulta y pasa los datos por props a un componente cliente cuando hace falta interactividad (filtros, pestañas, reproductor).
  - Los chips de filtro de la biblioteca son TODOS (fijo en la app) más todas las filas de `categories` por `sort_order`, aunque no tengan juegos. Una categoría sin juegos filtra a la lista vacía que ya existe.
  - Las tarjetas, las mini-tarjetas y el detalle muestran el `name` de la categoría del juego.
  - El Salón elige el juego con `?juego=<code>`. Sin parámetro o con un código inexistente, se usa el primer juego por `sort_order`.
- **Ranking:** una fila por nombre (su mejor puntuación). Top 10 en el detalle y top 12 en el Salón (podio + tabla).
- **Estadísticas:** "Partidas" es el número de puntuaciones guardadas del juego y "Mejor global" su puntuación máxima (0 si no hay ninguna). Se muestran en el detalle, y el mejor en las tarjetas de la biblioteca.
- **Guardar puntuación:** GUARDAR PUNTUACIÓN llama a una Server Action `submitScore` que valida e inserta en `scores`. Solo en juegos con `playable = true` (hoy solo `asteroids`).
  - En los juegos mock, el modal no muestra el campo ni el botón de guardar, y en su lugar dice "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- **Fila TÚ del Salón:** si hay usuario (login simulado) y existe una fila del ranking con su mismo nombre, se muestra con su posición y puntuación reales. Si no, no se muestra.
- **Estados:**
  - Ranking vacío: "SÉ EL PRIMERO EN ENTRAR AL SALÓN" en el bloque del ranking (detalle y Salón, sin podio).
  - Error al leer el ranking o las estadísticas: "RANKING NO DISPONIBLE" en el bloque, y el resto de la página funciona.
  - Error al leer `games` o `categories`: se lanza el error y lo muestra un `app/error.tsx` nuevo con estilo del portal y un botón REINTENTAR.
  - Guardado: el botón pasa a "GUARDANDO…" y se deshabilita. Si falla, el modal muestra "ERROR AL GUARDAR" y permite reintentar.
- Se eliminan `av_scores`, `lib/scores.ts`, `GAMES`, `PLAYERS` y `seededScores`. `CATS` y el tipo `GameCategory` también se eliminan: `lib/games-data.ts` se queda solo con tipos.

**Out of scope (for future specs):**

- Auth real con Supabase, y asociar puntuaciones a cuentas en lugar de a iniciales.
- Protección antitrampas (verificar la puntuación en servidor, rate limiting, captcha).
- Contar partidas iniciadas (no solo las guardadas).
- Migrar a Supabase lo que haya en `av_scores` de cada navegador.
- Ranking global entre juegos, rankings por periodo (semana, mes) o paginación.
- Tiempo real (suscripciones) en los rankings.
- Panel de administración para crear o editar juegos o categorías.
- Campos extra en `categories` (color, descripción, icono) o varias categorías por juego.
- Cambiar las etiquetas fijas del detalle o la dificultad.
- Los `STATS` y textos de marketing de la Home.

## Data model

Tabla `categories` (catálogo):

| Columna      | Tipo     | Restricciones                                                          |
| ------------ | -------- | ---------------------------------------------------------------------- |
| `id`         | `bigint` | PK, `generated always as identity`                                     |
| `code`       | `text`   | not null, unique, kebab-case (`arcade`, `puzzle`, `shooter`, `versus`) |
| `name`       | `text`   | not null, unique, texto visible (`ARCADE`…)                            |
| `sort_order` | `int`    | not null, unique                                                       |

Tabla `games`:

| Columna       | Tipo          | Restricciones                                                    |
| ------------- | ------------- | ---------------------------------------------------------------- |
| `id`          | `bigint`      | PK, `generated always as identity`                               |
| `code`        | `text`        | not null, unique, kebab-case (`asteroids`, `bloque-buster`…)     |
| `title`       | `text`        | not null (nombre visible)                                        |
| `short_desc`  | `text`        | not null                                                         |
| `long_desc`   | `text`        | not null                                                         |
| `category_id` | `bigint`      | not null, FK → `categories.id` `on delete restrict`              |
| `cover`       | `text`        | not null (clase CSS, p. ej. `cover-rocas`)                       |
| `color`       | `text`        | not null, `check (color in ('cyan','magenta','yellow','green'))` |
| `playable`    | `boolean`     | not null, default `false`                                        |
| `sort_order`  | `int`         | not null, unique                                                 |
| `created_at`  | `timestamptz` | not null, default `now()`                                        |

Tabla `scores`:

| Columna      | Tipo          | Restricciones                                                                                        |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------- |
| `id`         | `bigint`      | PK, `generated always as identity`                                                                   |
| `game_id`    | `bigint`      | not null, FK → `games.id` `on delete cascade`                                                        |
| `name`       | `text`        | not null, `check (char_length(name) between 1 and 10 and name = upper(name) and name = btrim(name))` |
| `score`      | `int`         | not null, `check (score between 0 and 10000000)`                                                     |
| `created_at` | `timestamptz` | not null, default `now()`                                                                            |

Índice `scores (game_id, score desc, created_at asc)`.

Formato de `code` en `categories` y `games`: `check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`. Los ids numéricos no se siembran a mano: la migración inserta sin `id` y enlaza `games.category_id` buscando la categoría por `code`.

Vistas (`security_invoker = true`):

- `leaderboard`: una fila por `(game_id, name)` con su mejor `score` y el `created_at` de esa puntuación, más `rank` calculado con `row_number()` por `game_id`, ordenado por `score desc, created_at asc` (en empate gana quien lo logró antes).
- `game_stats`: una fila por cada juego de `games` (left join) con `plays` (número de filas en `scores`) y `best` (máximo, 0 si no hay).

RLS:

- `categories` y `games`: `select` para `anon` y `authenticated`. Sin políticas de escritura.
- `scores`: `select` para `anon` y `authenticated`. `insert` para `anon` y `authenticated` con `with check (exists (select 1 from games g where g.id = game_id and g.playable))`. Sin `update` ni `delete`.

Tipos en la app:

```ts
// lib/games-data.ts (sin datos mock)
export interface Category {
  id: number;
  code: string; // "arcade"
  name: string; // "ARCADE"
}
export interface Game {
  id: number;
  code: string; // "asteroids", usado en las URLs
  title: string;
  short: string;
  long: string;
  category: Category;
  cover: string;
  color: GameColor;
  playable: boolean;
}
export interface GameWithStats extends Game {
  plays: number;
  best: number;
}
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
}
```

Server Action (`app/juegos/[id]/jugar/actions.ts`):

```ts
type SubmitScoreResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_game" | "invalid_name" | "invalid_score" | "db_error";
    };

export async function submitScore(input: {
  gameId: number;
  name: string;
  score: number;
}): Promise<SubmitScoreResult>;
```

Convenciones:

- `lib/games-db.ts` convierte las columnas de la BD (`short_desc`, `long_desc`, y `category_id` con join a `categories`) al tipo `Game` (`short`, `long`, `category`). Ningún componente usa los tipos generados directamente.
- `getGame(code)` busca por `code` y devuelve `null` si no existe (la página llama a `notFound()`). `getGames()` y `getGame(code)` devuelven `GameWithStats`, ordenados por `sort_order`. Si falla la consulta a `games`, lanzan un error. Si falla solo `game_stats`, devuelven `plays: 0` y `best: 0` y un flag `statsError: true` para mostrar "RANKING NO DISPONIBLE".
- `getCategories()` devuelve `Category[]` por `sort_order` y lanza un error si falla.
- El filtro de la biblioteca compara por `category.id` (numérico). TODOS no es una fila de la tabla.
- `getLeaderboard(gameId, limit)` recibe el id numérico y devuelve `{ rows: ScoreRow[] } | { error: true }`.
- `submitScore` normaliza el nombre (`trim` + mayúsculas) y comprueba, antes de insertar: juego existente y `playable`, nombre de 1 a 10 caracteres y puntuación entera entre 0 y 10 000 000. La BD repite esas comprobaciones con CHECK y RLS. El detalle del fallo se registra con el prefijo `[scores]`; al cliente solo le llega el código.
- El reproductor detecta Asteroids con `game.code === "asteroids"`, no con el id numérico.
- Tras insertar, `submitScore` llama a `revalidatePath` para `/juegos/<code>`, `/juegos`, `/` y `/salon-de-la-fama`.
- La fila TÚ se consulta desde el componente cliente del Salón con `lib/supabase/client.ts` sobre la vista `leaderboard` (`game_id` numérico + `name`), porque el usuario simulado solo existe en el navegador.
- Las fechas se muestran como `dd/mm/aaaa` a partir de `created_at`.

Archivos:

| Archivo                                                                                                                                                                           | Cambio                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_catalog_and_scores.sql`                                                                                                                          | Nuevo: tablas, índice, vistas, RLS y semilla de las 4 categorías y los 9 juegos          |
| `lib/supabase/database.types.ts`                                                                                                                                                  | Regenerado                                                                               |
| `lib/games-data.ts`                                                                                                                                                               | Quedan solo tipos (`Category`, `Game`, `GameWithStats`, `ScoreRow`, `GameColor`)         |
| `lib/games-db.ts`                                                                                                                                                                 | Nuevo: `getCategories`, `getGames`, `getGame(code)`, `getLeaderboard`                    |
| `lib/scores.ts`                                                                                                                                                                   | Eliminado                                                                                |
| `app/error.tsx`                                                                                                                                                                   | Nuevo                                                                                    |
| `app/page.tsx`, `app/juegos/page.tsx`, `app/juegos/[id]/page.tsx`, `app/salon-de-la-fama/page.tsx`, `app/juegos/[id]/jugar/page.tsx`                                              | Leen de Supabase como Server Components                                                  |
| `components/game-library.tsx`, `components/hall-of-fame.tsx`, `components/game-player.tsx`                                                                                        | Nuevos: la parte cliente de biblioteca, Salón y reproductor, movida desde sus `page.tsx` |
| `app/juegos/[id]/jugar/actions.ts`                                                                                                                                                | Nuevo: `submitScore`                                                                     |
| `components/leaderboard.tsx`, `components/hall-podium.tsx`, `components/hall-table.tsx`, `components/game-card.tsx`, `components/mini-card.tsx`, `components/game-over-modal.tsx` | Estados vacío, error y guardado; tipos nuevos; categoría desde `category.name`           |

## Implementation plan

1. Crear la migración con `npx supabase migration new catalog_and_scores`: tablas, índice, vistas, RLS, políticas, la semilla de las 4 categorías y la de los 9 juegos con los textos y categorías actuales de `GAMES`, usando el antiguo id de texto como `code` (`asteroids` con `playable = true` y `sort_order` 1, el resto en su orden actual). Aplicarla con `npx supabase db push`, revisar `get_advisors` de seguridad y regenerar tipos con `npm run db:types`. La app no cambia.
2. Crear `lib/games-db.ts` con `getCategories`, `getGames`, `getGame(code)` y `getLeaderboard`, y añadir a `lib/games-data.ts` los tipos `Category`, `GameWithStats` y un tipo provisional para el juego leído de la BD (sin borrar todavía los datos mock ni cambiar `Game`). Antes, leer la guía de data fetching en `node_modules/next/dist/docs/01-app/`. Todavía no se usa.
3. Pasar la Home, la biblioteca y el detalle a Supabase: la biblioteca se divide en `page.tsx` (servidor, lee juegos y categorías) y `components/game-library.tsx` (chips desde `categories` y búsqueda), las tarjetas muestran `category.name`, el detalle muestra partidas, mejor global y top 10 reales, y `Leaderboard` gana los estados vacío y de error. Crear `app/error.tsx` tras leer su guía. El Salón y el reproductor siguen con los mocks.
4. Pasar el Salón a Supabase: `page.tsx` (servidor) lee `?juego=` y el top 12, y `components/hall-of-fame.tsx` pinta las pestañas como enlaces, el podio (solo las posiciones que existen), la tabla, el estado vacío o de error y la fila TÚ consultada con el cliente de navegador.
5. Pasar el reproductor a Supabase y guardar puntuaciones: `page.tsx` (servidor) obtiene el juego por `code` y monta `components/game-player.tsx` con la lógica actual. Crear `submitScore` tras leer la guía de Server Actions, conectar el modal (GUARDANDO…, ERROR AL GUARDAR, mensaje para juegos no jugables) y eliminar `lib/scores.ts`, `GAMES`, `CATS`, `GameCategory`, `PLAYERS` y `seededScores`, y dejar `Game` con `category: Category`. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] `supabase/migrations/` contiene la migración, y `npx supabase migration list` la muestra aplicada en local y en remoto.
- [ ] En Supabase, `categories` tiene 4 filas (ARCADE, PUZZLE, SHOOTER, VERSUS por `sort_order`), y cada juego conserva la categoría que tenía en `GAMES`.
- [ ] `categories`, `games` y `scores` tienen `id bigint` autoincremental como PK, y ninguna tiene una PK de texto. `categories.code` y `games.code` son únicos.
- [ ] En Supabase, `games` tiene 9 filas, solo `asteroids` con `playable = true`, y `scores` empieza vacía.
- [ ] RLS está activado en `categories`, `games` y `scores`, y los advisors de seguridad no muestran avisos sobre estas tablas o vistas.
- [ ] Con la publishable key, un `insert` en `categories` o `games`, un `update` o `delete` en `scores` y un `insert` en `scores` con el `game_id` de `caida` fallan.
- [ ] `/juegos` y la Home muestran los mismos 9 juegos, con `ASTEROIDS` primero, y los filtros y la búsqueda funcionan igual que antes.
- [ ] Los chips de la biblioteca son TODOS, ARCADE, PUZZLE, SHOOTER y VERSUS, y cada tarjeta muestra el nombre de su categoría.
- [ ] Tras insertar una categoría nueva con SQL (y borrarla después), aparece como chip en `/juegos` sin cambiar código, y al pulsarla la lista queda vacía.
- [ ] Borrar una categoría que tiene juegos falla por la FK.
- [ ] `/juegos/asteroids`, `/juegos/asteroids/jugar` y `/salon-de-la-fama?juego=asteroids` funcionan con el `code`, y `/juegos/1` y `/juegos/no-existe` dan 404.
- [ ] Con `scores` vacía, el detalle de un juego muestra Partidas 0, Mejor global 0 y "SÉ EL PRIMERO EN ENTRAR AL SALÓN".
- [ ] Tras guardar una partida de Asteroids, el detalle de `asteroids` muestra Partidas 1, Mejor global igual a esa puntuación y una fila con las iniciales, la puntuación y la fecha de hoy.
- [ ] Guardar dos puntuaciones con el mismo nombre deja una sola fila de ese nombre en el ranking, con la mayor, y Partidas sube a 2.
- [ ] Con dos nombres empatados, aparece primero el que guardó antes.
- [ ] La tarjeta de ASTEROIDS en `/juegos` muestra el mismo mejor que el detalle.
- [ ] `/salon-de-la-fama?juego=asteroids` muestra el podio y la tabla reales. Con 1 o 2 puntuaciones, el podio solo muestra esas posiciones y no hay errores en la consola.
- [ ] En el Salón, cambiar de pestaña cambia `?juego=` en la URL, y recargar mantiene la pestaña.
- [ ] `/salon-de-la-fama?juego=no-existe` y `/salon-de-la-fama` muestran ASTEROIDS.
- [ ] Con sesión iniciada como un nombre que tiene puntuación, el Salón muestra la fila TÚ con su posición y puntuación reales. Con un nombre sin puntuación, o sin sesión, no hay fila TÚ.
- [ ] En el modal, el botón muestra "GUARDANDO…" mientras se guarda y después "▸ PUNTUACIÓN GUARDADA_".
- [ ] Guardar con iniciales vacías o solo espacios muestra "ERROR AL GUARDAR" y no inserta nada.
- [ ] En un juego mock (p. ej. CAÍDA), el modal de fin muestra "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES" y no tiene campo ni botón de guardar.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` apuntando a una URL que no responde, `/juegos` muestra `app/error.tsx` con REINTENTAR, sin pantalla en blanco.
- [ ] Si la vista `leaderboard` no está disponible (p. ej. renombrada temporalmente), el detalle muestra "RANKING NO DISPONIBLE" y el resto de la página se ve.
- [ ] `av_scores`, `saveScore`, `getScores`, `GAMES`, `CATS`, `GameCategory`, `PLAYERS` y `seededScores` no aparecen en `app/`, `components/` ni `lib/`.
- [ ] Asteroids se sigue jugando igual que en el SPEC 05 (pausa, auto-pausa, FIN, JUGAR DE NUEVO).
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** tabla `games` en Supabase como única fuente del catálogo. Decisión del usuario. Las puntuaciones la referencian con FK.
- **No:** dejar el catálogo en código y solo crear `scores`. Sin FK no se puede validar el juego en la BD.
- **Yes:** tabla catálogo `categories` con FK desde `games`. Decisión del usuario, añadida al revisar el spec. Una categoría nueva no necesita cambiar código ni un CHECK.
- **Yes:** PK `bigint generated always as identity` en todas las tablas. Decisión del usuario: las tablas no tienen ids de texto.
- **No:** PK de texto (slug o nombre visible). Descartado por el usuario.
- **Yes:** columna `code` única en `categories` y `games`, además del nombre. Decisión del usuario. Da URLs legibles y estables (`/juegos/asteroids`) sin exponer el id numérico.
- **No:** URLs con el id numérico (`/juegos/1`). Dependen del orden de inserción y no se leen bien.
- **Yes:** mantener el nombre de carpeta `[id]` en las rutas aunque reciba el `code`. Decisión del usuario, tras valorar quitar `code` y usar URLs numéricas. Renombrarla a `[code]` toca todas las rutas y los tipos `PageProps` sin cambiar el comportamiento; se puede hacer en otro spec.
- **No:** quitar `code` y usar el id numérico en las URLs. Descartado por el usuario.
- **Yes:** detectar Asteroids por `code` y no por id. El id numérico depende de la BD, el `code` no.
- **No:** columnas `color` o `description` en `categories`. Hoy no hay dónde mostrarlas.
- **Yes:** mostrar todas las categorías como chips, aunque no tengan juegos. Refleja el catálogo tal cual.
- **No:** ocultar las categorías sin juegos.
- **Yes:** TODOS sigue fijo en la app. Es un filtro, no una categoría.
- **Yes:** `on delete restrict` en `games.category_id`. No se puede dejar un juego sin categoría.
- **No:** fallback al catálogo local si Supabase falla. Serían dos fuentes de verdad.
- **Yes:** sembrar los 9 juegos y dejar `scores` vacía. Decisión del usuario: se acaban los rankings inventados.
- **No:** sembrar puntuaciones falsas.
- **Yes:** columna `playable` y solo los juegos reales guardan puntuaciones, validado en la Server Action y en RLS. Los mocks tienen una puntuación simulada que no significa nada.
- **Yes:** Server Action con validación e inserción anónima permitida por RLS con CHECKs. Decisión del usuario: sin auth real, es lo único posible. Se asume que alguien puede falsear puntuaciones.
- **No:** insertar directamente desde el navegador. Misma seguridad efectiva, pero sin un punto único de validación y log.
- **No:** usar la secret key en el servidor. Aún no hay necesidad y añadiría un secreto que custodiar.
- **No:** esperar al spec de auth para guardar puntuaciones.
- **Yes:** eliminar `av_scores` sin migrarlo. Decisión del usuario. Son datos locales de prueba.
- **Yes:** ranking con la mejor puntuación por nombre, y en empate gana quien lo logró antes. Evita que un jugador llene el ranking.
- **No:** listar todas las partidas.
- **Yes:** Partidas y Mejor global calculados desde `scores`, y se eliminan los valores fijos (`12.4K`, `28450`…). Los mocks pasan a mostrar 0.
- **No:** contador de partidas iniciadas. Necesita otra escritura anónima; otro spec.
- **Yes:** vistas SQL `leaderboard` y `game_stats` con `security_invoker`. El agrupado lo hace Postgres, queda versionado en la migración y respeta el RLS de las tablas.
- **No:** agrupar en TypeScript (trae todas las filas) ni función RPC (más código para lo mismo).
- **Yes:** `text` con CHECK para `color`, y `sort_order` para el orden. Se amplía con una migración simple.
- **No:** enums de Postgres. Alterarlos es más rígido.
- **Yes:** Server Components que consultan y pasan props a componentes cliente. Sin estados de carga en el cliente y con la consulta en el servidor.
- **No:** consultar desde el navegador en `useEffect` (salvo la fila TÚ).
- **Yes:** pestaña del Salón en `?juego=`. Se renderiza en el servidor y se puede compartir el enlace.
- **Yes:** fila TÚ real por nombre, consultada desde el navegador. El usuario simulado solo existe en `localStorage`.
- **Yes:** estados vacío y de error dentro del bloque del ranking, y `app/error.tsx` si falla `games` o `categories`. Un fallo del ranking no rompe la página.
- **Yes:** migración con Supabase CLI y `db push`, siguiendo la convención del SPEC 04. No se aplican cambios de esquema solo desde el MCP o el dashboard.

## Risks

| Risk                                                                                        | Mitigation                                                                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Cualquiera puede insertar puntuaciones falsas con la publishable key                        | Límite de 10 000 000 y solo juegos jugables. Se asume hasta el spec de auth y el de antitrampas. |
| Dos personas distintas con las mismas iniciales comparten fila en el ranking                | Es el comportamiento arcade clásico. Se resuelve cuando las puntuaciones se asocien a cuentas.   |
| Una vista sin `security_invoker` saltaría el RLS                                            | Se crean con `security_invoker = true` y se comprueba con los advisors.                          |
| Las fechas se formatean en el servidor (UTC) y pueden salir un día antes o después          | Aceptable para este spec. Se anota por si molesta.                                               |
| Las pantallas pasan a depender de Supabase, y el proyecto gratuito se pausa por inactividad | `app/error.tsx` lo hace evidente, y `/api/health` sigue disponible para diagnosticarlo.          |
| Mover la lógica de los `page.tsx` cliente a componentes nuevos puede romper Asteroids       | El paso 5 se prueba con los criterios del SPEC 05 (pausa, FIN, JUGAR DE NUEVO).                  |
| El podio del Salón asume 3 filas                                                            | Se adapta para 0, 1 o 2 filas, y hay un criterio de aceptación para ello.                        |

## What is **not** in this spec

- Auth real y puntuaciones asociadas a cuentas.
- Antitrampas, rate limiting o captcha.
- Contador de partidas iniciadas.
- Migración de `av_scores`.
- Ranking global, rankings por periodo, paginación y tiempo real.
- Panel de administración de juegos o categorías, y campos extra en `categories`.
- Cambios en las etiquetas del detalle o en los textos de la Home.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
