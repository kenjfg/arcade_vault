# SPEC 16 — Medidas básicas de seguridad

> **Status:** Implemented
> **Depends on:** SPEC 06, SPEC 14
> **Date:** 2026-10-15
> **Objective:** Cerrar el checklist de `references/security/security-cheklist.md` con cabeceras HTTP de seguridad, límites de Auth ajustados en Supabase y mensajes claros en la UI cuando Auth rechaza una contraseña o frena por exceso de intentos.

## Why this spec exists

El checklist pide cinco cosas, y antes de escribir este spec se comprobó cuáles ya estaban:

- **RLS:** ya activo en `categories`, `games`, `scores` y `profiles` (SPEC 06 y 14). Este spec solo lo verifica.
- **Contraseña mínima de 8:** `supabase/config.toml` y los formularios ya usan 8. Falta confirmarlo en el dashboard remoto.
- **Leaked password protection:** el advisor la marca como WARN. En Supabase solo existe en el plan Pro o superior, y el proyecto está en Free. Se deja como gap conocido y la UI queda lista para cuando se active.
- **Límite de altas por IP:** Supabase ya lo aplica (`sign_in_sign_ups`, 30 cada 5 minutos por defecto), pero la UI muestra el error genérico cuando salta.
- **Cabeceras de seguridad:** `next.config.ts` está vacío.

Los dos avisos del advisor sobre `username_available` son los que el SPEC 14 ya dio por esperados. Este spec los deja documentados como aceptados.

Al verificar RLS en el paso 6 apareció algo más: Supabase concede por defecto a `anon` y `authenticated` todos los privilegios sobre las tablas de `public` (`UPDATE`, `DELETE`, `TRUNCATE`, etc.), y los `grant` explícitos del SPEC 06 se suman a ellos. RLS bloquea las escrituras, pero `TRUNCATE` se salta RLS. Este spec revoca esos privilegios sobrantes.

## Scope

**In:**

- **Cabeceras HTTP** en `next.config.ts`, con `headers()` para `source: "/(.*)"`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (sin `preload`). Los navegadores la ignoran en HTTP, así que no afecta a `localhost`.
- **Supabase Auth (paso manual en el dashboard):**
  - Authentication → Sign In / Providers → Email: longitud mínima de contraseña `8` y sin caracteres obligatorios.
  - Authentication → Rate Limits: límite de altas e inicios de sesión `10` cada 5 minutos por IP.
  - Leaked password protection: no se activa (requiere Pro). Su WARN queda aceptado y documentado.
- **`supabase/config.toml`:** `sign_in_sign_ups = 10` en `[auth.rate_limit]`. `minimum_password_length = 8` y `password_requirements = ""` ya están y no cambian.
- **`lib/auth-errors.ts`** (nuevo), con dos ayudantes puros sobre el `AuthError` de `@supabase/supabase-js`:
  - `isRateLimitError(error)`: `true` si `error.code` es `over_request_rate_limit` o `over_email_send_rate_limit`.
  - `weakPasswordMessage(error, min)`: si es un `weak_password` cuyo `reasons` incluye `pwned`, devuelve "ESA CONTRASEÑA APARECE EN FILTRACIONES. ELIGE OTRA". Con cualquier otro `weak_password` devuelve `MÍNIMO ${min} CARACTERES`. Si no es `weak_password`, devuelve `null`.
- **Mensaje de demasiados intentos:** "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS".
  - `/iniciar-sesion` (`components/login-form.tsx`): nuevo `LoginError` `"rate"`, usado cuando `signInWithPassword` devuelve un error de límite.
  - `/registro` (`components/register-form.tsx`): error de formulario cuando `signUp` devuelve un error de límite. Con el reenvío de confirmación, el mismo texto sustituye al de fallo.
- **Contraseña filtrada:** `/registro` y `/nueva-contrasena` usan `weakPasswordMessage` para el error del campo contraseña en lugar del texto fijo actual. Con la protección desactivada, el comportamiento visible no cambia.
- **Privilegios mínimos** (migración nueva `revoke_extra_grants`): `revoke all` a `anon` y `authenticated` en `categories`, `games`, `scores` y `profiles`, y se vuelve a conceder solo lo que la app usa: `select` en `categories`, `games` y `scores` a los dos roles, `insert` en `scores` a los dos roles y `select` en `profiles` solo a `authenticated`. Las políticas RLS no cambian.
- **Verificación de RLS y privilegios:** consulta en `pg_class` y peticiones `PATCH`/`DELETE` con la clave publicable contra `games` y `scores` (ver Acceptance criteria).
- **Documentación:**
  - `CLAUDE.md`: cabeceras en `next.config.ts`, límite de Auth de 10 cada 5 minutos, WARN aceptados del advisor (`username_available` ×2 y leaked password protection por el plan Free), specs 01–16 y siguiente spec `17-...`.
  - `references/security/security-cheklist.md`: marcar los cinco puntos, con una nota en leaked password protection ("pendiente de plan Pro; UI preparada").

**Out of scope (for future specs):**

- Captcha (Cloudflare Turnstile o hCaptcha) en el registro o el inicio de sesión.
- Content-Security-Policy (con nonces en `proxy.ts`).
- Activar leaked password protection, que requiere pasar a Pro.
- Reglas de composición de contraseña (`letters_digits` y similares).
- `FORCE ROW LEVEL SECURITY` o cambios en las políticas.
- Privilegios de las vistas (`leaderboard`, `game_stats`) y `alter default privileges` para las tablas futuras.
- Quitar o rediseñar `username_available`.
- Mensajes de límite en `/recuperar-contrasena` (siempre muestra el mismo mensaje para no revelar si una cuenta existe) y en `/nueva-contrasena`.
- Límite de envíos de puntuación (`submitScore`) o del formulario de contacto.
- `poweredByHeader: false` y otras cabeceras no listadas.
- Cabeceras y URLs de producción (van con el despliegue).

## Data model

No hay tablas, columnas ni funciones SQL nuevas. Se reutiliza el esquema de los SPEC 06 y 14.

Migración `supabase/migrations/<timestamp>_revoke_extra_grants.sql` (solo privilegios):

| Tabla        | `anon`             | `authenticated`    |
| ------------ | ------------------ | ------------------ |
| `categories` | `select`           | `select`           |
| `games`      | `select`           | `select`           |
| `scores`     | `select`, `insert` | `select`, `insert` |
| `profiles`   | ninguno            | `select`           |

El trigger `handle_new_user` y `username_available` son `security definer` y no dependen de estos privilegios.

```ts
// lib/auth-errors.ts
export const RATE_LIMIT_MESSAGE = "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS";
export const PWNED_PASSWORD_MESSAGE =
  "ESA CONTRASEÑA APARECE EN FILTRACIONES. ELIGE OTRA";

export function isRateLimitError(error: AuthError): boolean;
export function weakPasswordMessage(
  error: AuthError,
  min: number,
): string | null;

// components/login-form.tsx
type LoginError =
  "credentials" | "unconfirmed" | "network" | "link" | "oauth" | "rate"; // RATE_LIMIT_MESSAGE
```

`weakPasswordMessage` reconoce el error con `isAuthWeakPasswordError` de `@supabase/supabase-js`, que expone `reasons` (`"length" | "characters" | "pwned"`).

### Archivos

| Archivo                                                   | Cambio                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_revoke_extra_grants.sql` | Nuevo: `revoke all` y `grant` mínimos                                      |
| `next.config.ts`                                          | `headers()` con las cinco cabeceras                                        |
| `supabase/config.toml`                                    | `sign_in_sign_ups = 10`                                                    |
| `lib/auth-errors.ts`                                      | Nuevo: `isRateLimitError`, `weakPasswordMessage` y los dos mensajes        |
| `components/login-form.tsx`                               | Error `"rate"`                                                             |
| `components/register-form.tsx`                            | Mensaje de límite en `signUp` y en el reenvío; `weakPasswordMessage`       |
| `app/nueva-contrasena/page.tsx`                           | `weakPasswordMessage`                                                      |
| `CLAUDE.md`                                               | Cabeceras, límite de Auth, WARN aceptados, specs 01–16, siguiente `17-...` |
| `references/security/security-cheklist.md`                | Puntos marcados y nota sobre leaked password protection                    |

## Implementation plan

1. **Cabeceras.** Añadir `headers()` en `next.config.ts` (leer antes `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`). Prueba manual: con `npm run dev`, `curl -I http://localhost:3000/` y `curl -I http://localhost:3000/juegos/asteroids/jugar` muestran las cinco cabeceras. Home, un juego, `/iniciar-sesion` y el login con GitHub siguen funcionando.
2. **Supabase Auth.** En el dashboard, confirmar la longitud mínima `8` sin caracteres obligatorios y bajar el límite de altas e inicios de sesión a `10` cada 5 minutos. Poner `sign_in_sign_ups = 10` en `supabase/config.toml`. La app no cambia.
3. **Ayudantes de errores.** Crear `lib/auth-errors.ts`. Nadie lo usa todavía.
4. **Login.** Añadir el error `"rate"` en `components/login-form.tsx`. Prueba manual: más de 10 intentos fallidos en 5 minutos muestran "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS".
5. **Registro y nueva contraseña.** Usar `isRateLimitError` en `signUp` y en el reenvío de `components/register-form.tsx`, y `weakPasswordMessage` en `register-form.tsx` y en `app/nueva-contrasena/page.tsx`. Prueba manual: un registro válido sigue enviando el correo y una contraseña de 7 caracteres sigue mostrando "MÍNIMO 8 CARACTERES".
6. **Privilegios mínimos, RLS y advisor.** Crear `<timestamp>_revoke_extra_grants.sql` con `npx supabase migration new revoke_extra_grants` y aplicarla con `npx supabase db push`. Ejecutar la consulta de `pg_class` y las peticiones `PATCH`/`DELETE` con la clave publicable de los criterios de aceptación. Revisar `get_advisors` (seguridad). Prueba manual: el catálogo, el Salón de la Fama y guardar una puntuación siguen funcionando.
7. **Documentación.** Actualizar `CLAUDE.md` y `references/security/security-cheklist.md`.

## Acceptance criteria

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `curl -I` de `/`, `/juegos/asteroids/jugar` y `/api/health` devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, la `Permissions-Policy` indicada y `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
- [ ] Una página que intenta cargar `http://localhost:3000/` en un `<iframe>` no la muestra (la consola del navegador indica el bloqueo por `X-Frame-Options`).
- [ ] Con las cabeceras puestas: se juega una partida de Asteroids y se guarda la puntuación, el formulario de contacto envía y el login con GitHub termina en `/juegos` con sesión.
- [ ] `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'` devuelve `relrowsecurity = true` en `categories`, `games`, `profiles` y `scores`.
- [ ] Un `PATCH` y un `DELETE` a `/rest/v1/games` y a `/rest/v1/scores` con la clave publicable (sin sesión) devuelven un error de permisos (`42501`), y las filas no cambian.
- [ ] `information_schema.role_table_grants` muestra para `anon` y `authenticated` solo los privilegios de la tabla del Data model en las cuatro tablas.
- [ ] Tras la migración, `/juegos`, `/salon-de-la-fama` y guardar una puntuación de un juego real siguen funcionando, y con sesión la barra de navegación muestra el nombre del jugador.
- [ ] En el dashboard, la longitud mínima de contraseña es `8` y el límite de altas e inicios de sesión es `10` cada 5 minutos.
- [ ] `supabase/config.toml` tiene `sign_in_sign_ups = 10` y `minimum_password_length = 8`.
- [ ] Registrarse con una contraseña de 7 caracteres muestra "MÍNIMO 8 CARACTERES" bajo el campo contraseña.
- [ ] En `/iniciar-sesion`, el undécimo intento en 5 minutos desde la misma IP muestra "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS".
- [ ] En `/registro`, un `signUp` rechazado por límite muestra "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS".
- [ ] `weakPasswordMessage` devuelve "ESA CONTRASEÑA APARECE EN FILTRACIONES. ELIGE OTRA" para un `weak_password` con `reasons: ["pwned"]` y `MÍNIMO 8 CARACTERES` para `reasons: ["length"]` (comprobado con un error construido a mano en la consola del navegador o con un script temporal fuera del repositorio).
- [ ] `get_advisors` (seguridad) muestra como mucho los tres WARN conocidos (`username_available` ×2 y leaked password protection) y ningún aviso nuevo.
- [ ] `CLAUDE.md` documenta las cabeceras, el límite de Auth y los WARN aceptados, y dice que la siguiente spec es `17-...`.
- [ ] `references/security/security-cheklist.md` tiene los cinco puntos marcados y la nota sobre leaked password protection.

## Decisions

- **Yes:** leaked password protection documentada como gap conocido, con la UI preparada. Requiere el plan Pro. El día que se active, `/registro` y `/nueva-contrasena` ya explican el rechazo.
- **No:** pasar a Pro dentro de este spec. Es una decisión de coste, no de código.
- **Yes:** límite de Supabase de 10 cada 5 minutos por IP. Frena altas automáticas en ráfaga y deja margen a una persona que se equivoca varias veces.
- **No:** captcha en este spec. Añade claves, un widget y configuración en Supabase; va en su propio spec si los bots llegan a ser un problema.
- **No:** mantener 30 ni subir a 15. Con 30, un bot puede hacer 360 altas por hora desde una IP; varios jugadores detrás de la misma IP son raros en este proyecto.
- **Yes:** solo longitud mínima de 8, sin reglas de composición. Coincide con lo que la UI ya valida, y NIST desaconseja exigir tipos de carácter.
- **Yes:** las tres cabeceras del checklist más `Permissions-Policy` y `Strict-Transport-Security`. Ninguna de las dos rompe nada de la app: no se usan cámara, micrófono ni geolocalización, y HSTS solo actúa en HTTPS.
- **No:** `preload` en HSTS. Es difícil de deshacer y todavía no hay dominio de producción.
- **No:** Content-Security-Policy. Con los estilos inline, Supabase, OAuth y Resend, el riesgo de romper la app es alto; necesita nonces en `proxy.ts` y su propio spec.
- **Yes:** `X-Frame-Options: DENY`. Nadie embebe el sitio y el flujo OAuth no usa iframes.
- **Yes:** RLS sin cambios. Ya está activo en todas las tablas, y `FORCE` solo afectaría al dueño (`postgres`), que no es un riesgo aquí.
- **Yes:** revocar los privilegios por defecto de `anon` y `authenticated` y dejar solo los que usa la app. Decidido durante el paso 6, al ver que `PATCH`/`DELETE` devolvían 200 con `[]` en vez de un error de permisos. Es defensa en profundidad: si una política futura se escribe mal, no hay privilegio de escritura detrás, y `TRUNCATE`, que se salta RLS, deja de estar concedido.
- **No:** solo ajustar el criterio y aceptar los privilegios por defecto. Hoy RLS basta, pero deja `TRUNCATE` concedido sin necesidad.
- **Yes:** WARN de `username_available` aceptados. El registro necesita comprobar el nombre sin sesión y la función solo devuelve un booleano (decisión del SPEC 14).
- **No:** quitar `username_available`. El aviso de nombre ocupado llegaría solo al enviar el formulario.
- **Yes:** mensaje de límite solo en login y registro. Son los formularios que llaman a `signInWithPassword` y `signUp`. `/recuperar-contrasena` siempre muestra el mismo mensaje para no revelar si una cuenta existe.
- **Yes:** ayudantes en `lib/auth-errors.ts`. Tres formularios interpretan los mismos códigos de error, y así no se repite la lógica.

## Risks

| Risk                                                                                         | Mitigation                                                                                                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| El límite de 10 cada 5 minutos bloquea a varios jugadores detrás de la misma IP              | Pocas personas comparten IP en este proyecto. Si pasa, se sube el valor en el dashboard y en `config.toml`, sin cambiar código.  |
| Probar el criterio del undécimo intento bloquea la IP del desarrollador durante unos minutos | Se prueba al final del paso 4 y se espera a que pasen los 5 minutos antes de seguir.                                             |
| Una cabecera rompe algo no previsto (por ejemplo, un iframe futuro)                          | Las cabeceras viven en un solo bloque de `next.config.ts`. El paso 1 incluye una pasada manual por las pantallas principales.    |
| El código de error de límite cambia en una versión futura de Supabase                        | Los dos códigos viven solo en `isRateLimitError`. Si no se reconocen, la UI vuelve a mostrar el mensaje genérico, que ya existe. |
| Leaked password protection sigue desactivada                                                 | Gap aceptado y documentado en `CLAUDE.md` y en el checklist. Activarla en Pro no necesita código.                                |

## What is **not** in this spec

- Captcha.
- Content-Security-Policy.
- Activar leaked password protection (plan Pro).
- Reglas de composición de contraseña.
- Cambios en las políticas RLS, privilegios de las vistas y `alter default privileges`.
- Cambios en `username_available`.
- Límites en `/recuperar-contrasena`, `/nueva-contrasena`, `submitScore` o el formulario de contacto.
- Configuración de producción.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
