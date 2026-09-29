# SPEC 04 — Conexión de la app con Supabase

> **Status:** Implemented
> **Depends on:** Ninguno
> **Date:** 2026-09-29
> **Objective:** Conectar la app de Next.js con el proyecto de Supabase (clientes de servidor y navegador, Supabase CLI vinculada, tipos generados y una ruta `/api/health` que verifica la conexión) sin crear tablas ni cambiar ninguna pantalla.

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno públicas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example`.
- Clientes tipados con `Database`:
  - `lib/supabase/server.ts`: `createClient()` asíncrono con `createServerClient` y las cookies de `next/headers`.
  - `lib/supabase/client.ts`: `createClient()` con `createBrowserClient`.
- Supabase CLI:
  - Paquete `supabase` como devDependency.
  - `supabase init`, con la carpeta `supabase/` versionada (`config.toml` y su `.gitignore`).
  - `supabase link` al proyecto remoto `tooomjvkfhxfqgmjsctk`.
- Script `npm run db:types`, que genera `lib/supabase/database.types.ts` desde el proyecto vinculado. El archivo generado se versiona.
- Route Handler `GET /api/health` (`app/api/health/route.ts`), que consulta `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/health` con la publishable key y responde con el estado de la conexión.

**Out of scope (for future specs):**

- Auth real con Supabase (login, registro, logout) en sustitución del login simulado de `localStorage`.
- `proxy.ts` para refrescar la sesión. Llega con el spec de auth.
- Tablas, migraciones, RLS y la tabla `profiles`.
- Guardar puntuaciones en Supabase en lugar de `av_scores`.
- Login con Google o GitHub y sesiones anónimas para invitados.
- Stack local de Supabase con Docker (`supabase start`).
- Cualquier indicador de conexión en la UI.

## Data model

No introduce tablas ni datos persistidos. Solo configuración, tipos y el contrato de `/api/health`.

Variables de entorno (públicas por diseño, llegan al bundle del navegador):

| Variable                               | Obligatoria | Uso                                                           |
| -------------------------------------- | ----------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí          | URL del proyecto (`https://tooomjvkfhxfqgmjsctk.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí          | Publishable key (`sb_publishable_...`)                        |

Respuesta de `GET /api/health` (JSON, sin caché):

```ts
type HealthResponse =
  | { ok: true } // HTTP 200
  | { ok: false; error: "missing_env" | "unauthorized" | "unreachable" }; // HTTP 503
```

Convenciones:

- `missing_env`: falta alguna de las dos variables. No se hace ninguna petición.
- `unauthorized`: Supabase responde 401 o 403, porque la clave no es válida.
- `unreachable`: error de red, timeout de 5 s o cualquier otro estado distinto de 200.
- El detalle del fallo se registra en el servidor con el prefijo `[health]`. La respuesta solo lleva el código.
- Si falta una variable, los dos `createClient()` lanzan un `Error` que nombra la variable. La app arranca igual, porque hoy nada los importa.
- `lib/supabase/database.types.ts` es un archivo generado: no se edita a mano, se regenera con `npm run db:types`.

## Implementation plan

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Añadir a `.env.example` un bloque con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, explicando que son públicas y que nunca se debe poner ahí la secret key. El usuario rellena `.env.local`. La app se ve igual que antes.
2. Instalar `supabase` como devDependency y ejecutar `npx supabase init`, que crea `supabase/`. Vincular el proyecto con `npx supabase link --project-ref tooomjvkfhxfqgmjsctk`, que requiere un `npx supabase login` previo que ejecuta el usuario. La app no cambia.
3. Añadir el script `db:types` a `package.json` (`supabase gen types typescript --linked > lib/supabase/database.types.ts`), ejecutarlo y versionar el resultado.
4. Crear `lib/supabase/server.ts` y `lib/supabase/client.ts` según la guía oficial de `@supabase/ssr` para el App Router, tipados con `Database`. En el cliente de servidor, `setAll` ignora el error de escritura de cookies cuando se llama desde un Server Component. Todavía no se usan en ninguna parte.
5. Crear `app/api/health/route.ts` con `GET`, que devuelve el `HealthResponse` descrito en el modelo de datos, sin caché y con `AbortSignal.timeout(5000)`. Antes, leer la guía de Route Handlers en `node_modules/next/dist/docs/01-app/`. Probar manualmente con `.env.local` correcto, sin variables y con una clave inválida. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`, `supabase` en `devDependencies` y el script `db:types`.
- [x] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores, y `.env.local` sigue ignorado por git.
- [x] `supabase/config.toml` está versionado, y `supabase/.temp` no aparece en `git status`.
- [x] `npx supabase projects list` marca `tooomjvkfhxfqgmjsctk` como vinculado.
- [x] `npm run db:types` termina sin errores y regenera `lib/supabase/database.types.ts`.
- [x] `lib/supabase/server.ts` y `lib/supabase/client.ts` exportan `createClient()` tipado con `Database`.
- [x] Con `.env.local` correcto, `GET /api/health` responde 200 con `{ "ok": true }`.
- [x] Sin alguna de las dos variables, `GET /api/health` responde 503 con `{ "ok": false, "error": "missing_env" }` y la app arranca.
- [x] Con una publishable key inválida, `GET /api/health` responde 503 con `{ "ok": false, "error": "unauthorized" }`.
- [x] Con una URL que no responde, `GET /api/health` responde 503 con `{ "ok": false, "error": "unreachable" }` en unos 5 s como máximo.
- [x] Dos peticiones seguidas a `/api/health` consultan Supabase las dos veces, porque la respuesta no se cachea.
- [x] Ninguna pantalla existente cambia, y el login simulado y `av_scores` funcionan igual que antes.
- [x] El proyecto de Supabase sigue sin tablas en el schema `public`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** solo la conexión. Decisión del usuario: sin tablas ni auth por ahora. Así el spec queda pequeño y se verifica solo.
- **No:** incluir el auth real con Supabase. Toca el formulario, el `AuthProvider`, el nav y la configuración de Auth; va en su propio spec.
- **Yes:** publishable key (`sb_publishable_...`). Es el formato actual que recomienda Supabase.
- **No:** anon key (JWT legacy). Formato antiguo.
- **Yes:** clientes de servidor y navegador con `@supabase/ssr`. Es el paquete oficial para el App Router, y deja la sesión en cookies para el spec de auth.
- **No:** `proxy.ts` de refresco de sesión en este spec. Sin sesiones no hace nada; llega con el auth.
- **Yes:** Supabase CLI con `init` y `link`, y la carpeta `supabase/` versionada. Las migraciones futuras quedarán en git y se podrán revisar en los PR.
- **No:** stack local con Docker. Añade una dependencia pesada que hoy no hace falta.
- **No:** aplicar cambios de esquema solo desde el MCP o el dashboard. No quedaría versionado.
- **Yes:** script `db:types` y tipos versionados desde ya. Fija la convención antes de que existan tablas.
- **Yes:** `/api/health` permanente, que consulta `/auth/v1/health`. Valida a la vez la URL y la clave sin depender de ninguna tabla.
- **No:** comprobar con una consulta de `supabase-js`. Sin tablas, los errores son ambiguos.
- **No:** indicador de conexión en la UI. No aporta nada al jugador.
- **Yes:** respuesta con solo un código de error y el detalle en el log del servidor. No expone la configuración en un endpoint público.
- **Yes:** los clientes lanzan un error explícito si falta una variable, en lugar de usar `!`. El fallo dice qué falta.
- **Yes:** "JUGAR COMO INVITADO" sigue igual y Google/GitHub quedan fuera. Decisión del usuario, pendiente del spec de auth.

## Risks

| Risk                                                                        | Mitigation                                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Alguien pone la secret key en una variable `NEXT_PUBLIC_`                   | `.env.example` avisa de que solo va la publishable key. La secret key no se usa en este spec. |
| La publishable key es pública, y una tabla futura sin RLS quedaría expuesta | Hoy no hay tablas. Cualquier spec que cree tablas debe activar RLS.                           |
| `supabase link` y `db:types` requieren `supabase login` con token personal  | El usuario ejecuta el login. El token queda en su máquina y no en el repo.                    |
| El proyecto gratuito se pausa por inactividad                               | `/api/health` responde `unreachable` y lo hace evidente.                                      |
| `db:types` escribe un archivo vacío o roto si falla                         | Se revisa el diff del archivo generado antes de versionarlo.                                  |

## What is **not** in this spec

- Auth real (login, registro, logout, confirmación de correo, recuperación de contraseña).
- `proxy.ts` y refresco de sesión.
- Tablas, migraciones, RLS y perfiles.
- Puntuaciones en Supabase.
- OAuth con Google o GitHub y sesiones anónimas.
- Stack local con Docker.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
