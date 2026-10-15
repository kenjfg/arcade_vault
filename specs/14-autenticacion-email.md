# SPEC 14 — Inicio de sesión y registro con correo y contraseña

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 04, SPEC 06
> **Date:** 2026-10-15
> **Objective:** Sustituir el usuario simulado de `localStorage` por Supabase Auth con correo y contraseña, con pantallas separadas de inicio de sesión y de registro, confirmación por correo, reenvío de la confirmación y recuperación de contraseña.

## Why this spec exists

Hasta ahora la sesión es simulada: `lib/auth-context.tsx` guarda `{ name }` en `localStorage` (`av_user`) y la pantalla `/iniciar-sesion` acepta cualquier usuario y contraseña. Este spec introduce cuentas reales con Supabase Auth y un nombre de jugador único por cuenta (`profiles.username`), que es el que se usa en el leaderboard.

La petición original incluía también Google y GitHub. Se divide: OAuth necesita apps en cada proveedor, una ruta de callback y un paso extra para elegir el nombre de jugador (OAuth no lo trae). Va en el SPEC 15. Ligar las puntuaciones a la cuenta (`scores.user_id` y RLS solo para autenticados) también queda fuera.

## Scope

**In:**

- **Tabla `public.profiles`** con el nombre de jugador de cada cuenta, creada por un trigger al registrarse. Ver Data model.
- **Función `public.username_available(p_username text)`** para comprobar en el formulario de registro si el nombre está libre.
- **Proxy de sesión** `proxy.ts` en la raíz (Next 16 llama Proxy a lo que antes era Middleware) que refresca la sesión de Supabase en cada petición, con `lib/supabase/proxy.ts` (`updateSession`). El matcher excluye `_next/static`, `_next/image`, `favicon.ico` y los archivos de imagen.
- **Contexto de sesión** `lib/auth-context.tsx` reescrito sobre el cliente de navegador de Supabase:
  - `useAuth()` devuelve `{ user, loading, logout }`. `user` sigue siendo `{ name } | null`, con `name = profiles.username`, para no tocar `hall-of-fame.tsx`.
  - Escucha `onAuthStateChange` y, con sesión, lee la fila propia de `profiles`.
  - `login()` desaparece. `logout()` llama a `supabase.auth.signOut()`.
  - Al montar, borra la clave antigua `av_user` de `localStorage`.
- **`/iniciar-sesion`** (pantalla de inicio de sesión):
  - Campos "Correo electrónico" y "Contraseña". Botón "ENTRAR AL VAULT" que llama a `signInWithPassword`. Con éxito, va a `/juegos`.
  - Enlaces "¿OLVIDASTE TU CONTRASEÑA?" a `/recuperar-contrasena` y "¿NO TIENES CUENTA? CREAR CUENTA" a `/registro`.
  - Botón "JUGAR COMO INVITADO", que va a `/juegos` sin sesión.
  - Botones GOOGLE y GITHUB visibles pero deshabilitados, con la etiqueta "PRÓXIMAMENTE".
  - Errores en el formulario (no en `alert`): "CORREO O CONTRASEÑA INCORRECTOS" (`invalid_credentials`), "CONFIRMA TU CORREO ANTES DE ENTRAR" (`email_not_confirmed`, con botón "REENVIAR CORREO") y "NO SE PUDO CONECTAR. INTÉNTALO DE NUEVO" (cualquier otro error).
  - Si llega con `?error=enlace`, muestra "EL ENLACE NO ES VÁLIDO O HA CADUCADO".
- **`/registro`** (pantalla de registro):
  - Campos "Nombre de jugador", "Correo electrónico", "Contraseña" y "Repetir contraseña". Botón "CREAR CUENTA".
  - Validación en cliente antes de enviar: nombre de 3 a 10 caracteres `A–Z`, `0–9` o `_` (se pasa a mayúsculas al escribir), correo con `type="email"`, contraseña de 8 caracteres o más y las dos contraseñas iguales. Cada error se muestra bajo su campo.
  - Antes de `signUp`, llama a `username_available`. Si está ocupado: "ESE NOMBRE YA ESTÁ EN USO".
  - `signUp` envía `options.data.username` y `options.emailRedirectTo` hacia `/auth/confirm`.
  - Con éxito, la misma pantalla cambia a un estado "REVISA TU CORREO" con el correo usado, un botón "REENVIAR CORREO" (`auth.resend({ type: "signup" })`) y un enlace a `/iniciar-sesion`.
  - Enlace "¿YA TIENES CUENTA? INICIAR SESIÓN" a `/iniciar-sesion`.
- **`/auth/confirm`** (Route Handler `GET`): recibe `token_hash`, `type` (`email` o `recovery`) y `next`, llama a `verifyOtp` con el cliente de servidor y redirige a `next` (solo rutas internas que empiezan por `/`; si no, `/juegos`). Si falla, redirige a `/iniciar-sesion?error=enlace`.
- **`/recuperar-contrasena`**: campo de correo y botón "ENVIAR ENLACE" (`resetPasswordForEmail` con `redirectTo` hacia `/auth/confirm?type=recovery&next=/nueva-contrasena`). Siempre muestra "SI EL CORREO EXISTE, TE HEMOS ENVIADO UN ENLACE", exista o no la cuenta.
- **`/nueva-contrasena`**: campos "Nueva contraseña" y "Repetir contraseña" (mismas reglas que el registro) y botón "GUARDAR CONTRASEÑA" (`updateUser({ password })`). Con éxito, va a `/juegos`. Sin sesión (enlace no usado o caducado), muestra "EL ENLACE NO ES VÁLIDO O HA CADUCADO" y un enlace a `/recuperar-contrasena`.
- **Usuario con sesión en `/iniciar-sesion` o `/registro`:** se redirige a `/juegos`.
- **Barra de navegación:** con sesión, muestra el nombre del jugador como texto (`.auth-user`, no pulsable) y al lado un botón "Cerrar sesión", igual que el menú móvil. El botón cierra la sesión real y va a `/`. Mientras `loading` es `true`, no muestra ni el nombre ni "Iniciar sesión" (evita el parpadeo).
- **Modal "FIN DEL JUEGO":** con sesión, el input del nombre es de solo lectura y muestra el username. Como invitado sigue editable con "INVITADO" por defecto, igual que hoy.
- **Estilo:** las cuatro pantallas reutilizan `.av-auth-wrap`, `.auth-card`, `.auth-header`, `.field` y `.auth-divider` de `app/globals.css`. Se añaden solo las clases que falten para el error de campo (`.field-error`), el mensaje de formulario (`.auth-msg`, con variantes de error y de éxito) y el nombre del jugador en la barra de navegación (`.av-nav .auth-user`).
- **Configuración del proyecto de Supabase** (dashboard, paso manual documentado en el plan):
  - Authentication → Sign In / Providers → Email: "Confirm email" activado y longitud mínima de contraseña 8.
  - URL Configuration: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/**`.
  - Plantillas "Confirm signup" y "Reset password" en español, con el enlace `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<email|recovery>&next=<ruta>`.
  - Se usa el SMTP por defecto de Supabase.
- `supabase/config.toml` refleja lo mismo para el entorno local: `enable_confirmations = true`, `minimum_password_length = 8` y `site_url = "http://localhost:3000"`.
- `CLAUDE.md`: la sesión deja de ser simulada; specs 01–14; siguiente spec `15-...`.

**Out of scope (for future specs):**

- Google y GitHub (SPEC 15), con el paso para elegir el nombre de jugador.
- Ligar `scores` a la cuenta (`user_id`), RLS solo para autenticados y reservar los nombres registrados frente a los invitados.
- Página de perfil, cambiar el nombre de jugador o el correo, borrar la cuenta.
- Menú desplegable en la barra de navegación.
- SMTP propio (Resend u otro) y dominio de envío.
- Rutas protegidas: ninguna pantalla exige sesión.
- Captcha y límites de intentos propios (se usan los de Supabase).

## Data model

Migración `supabase/migrations/<timestamp>_auth_profiles.sql`:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);
```

- `username` cumple también las reglas de `scores.name` (1–10 caracteres, mayúsculas, sin espacios en los extremos), así que se puede guardar tal cual como nombre de puntuación.
- **RLS:** activada. Una sola política `select` para `authenticated` con `id = (select auth.uid())`. Sin políticas de `insert`, `update` ni `delete`: solo escribe el trigger.
- **Trigger** `on_auth_user_created` (`after insert on auth.users`) con la función `public.handle_new_user()` (`security definer`, `set search_path = ''`): inserta `(new.id, upper(new.raw_user_meta_data ->> 'username'))`. Si el nombre falta, no cumple el formato o ya existe, la inserción falla y Supabase rechaza el registro.
- **Función** `public.username_available(p_username text) returns boolean` (`security definer`, `set search_path = ''`, `stable`): `true` si no existe ningún perfil con `upper(p_username)`. `execute` concedido a `anon` y `authenticated`.

Contexto de sesión (`lib/auth-context.tsx`):

```ts
interface AuthUser {
  name: string; // profiles.username
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean; // true hasta conocer la sesión inicial y su perfil
  logout: () => Promise<void>;
}
```

`lib/supabase/database.types.ts` se regenera con `npm run db:types`.

### Archivos

| Archivo                                             | Cambio                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/migrations/<timestamp>_auth_profiles.sql` | Nuevo: `profiles`, RLS, trigger `handle_new_user` y `username_available` |
| `lib/supabase/database.types.ts`                    | Regenerado                                                               |
| `supabase/config.toml`                              | Confirmación de correo, contraseña mínima 8 y `site_url`                 |
| `lib/supabase/proxy.ts`                             | Nuevo: `updateSession(request)`                                          |
| `proxy.ts`                                          | Nuevo: llama a `updateSession`, con su `matcher`                         |
| `lib/supabase/server.ts`                            | Solo el comentario de `setAll` (el proxy ya refresca la sesión)          |
| `app/auth/confirm/route.ts`                         | Nuevo: `verifyOtp` y redirección                                         |
| `lib/auth-context.tsx`                              | Reescrito sobre Supabase Auth                                            |
| `components/nav.tsx`                                | `logout` asíncrono y estado `loading`                                    |
| `components/login-form.tsx`                         | Nuevo: formulario de inicio de sesión                                    |
| `components/register-form.tsx`                      | Nuevo: formulario de registro y estado "REVISA TU CORREO"                |
| `components/auth-form.tsx`                          | Borrado (lo sustituyen los dos anteriores)                               |
| `app/iniciar-sesion/page.tsx`                       | Usa `LoginForm`                                                          |
| `app/registro/page.tsx`                             | Nuevo                                                                    |
| `app/recuperar-contrasena/page.tsx`                 | Nuevo                                                                    |
| `app/nueva-contrasena/page.tsx`                     | Nuevo                                                                    |
| `components/game-player.tsx`                        | Pasa `nameLocked` al modal cuando hay sesión                             |
| `components/game-over-modal.tsx`                    | Prop `nameLocked` (input `readOnly`)                                     |
| `app/globals.css`                                   | `.field-error`, `.auth-msg` y `.av-nav .auth-user`                       |
| `CLAUDE.md`                                         | Auth real, specs 01–14, siguiente spec `15-...`                          |

## Implementation plan

1. **Migración.** Crear `<timestamp>_auth_profiles.sql` con `npx supabase migration new auth_profiles`, con la tabla, la RLS, el trigger y la función. Aplicarla con `npx supabase db push` y regenerar los tipos con `npm run db:types`. Comprobar con `get_advisors` (MCP) que no hay avisos nuevos de seguridad. La app no cambia.
2. **Configuración de Supabase.** Aplicar en el dashboard los ajustes de Email, URL Configuration y las dos plantillas en español. Actualizar `supabase/config.toml` con los mismos valores. La app no cambia.
3. **Proxy de sesión.** Crear `lib/supabase/proxy.ts` y `proxy.ts`, y actualizar el comentario de `lib/supabase/server.ts`. Prueba manual: todas las pantallas cargan igual y `/api/health` responde.
4. **Ruta `/auth/confirm`.** Crear `app/auth/confirm/route.ts`. Prueba manual: `/auth/confirm` sin parámetros redirige a `/iniciar-sesion?error=enlace`.
5. **Contexto de sesión e inicio de sesión.** Reescribir `lib/auth-context.tsx`, ajustar `components/nav.tsx`, crear `components/login-form.tsx` con sus errores y el reenvío, cambiar `app/iniciar-sesion/page.tsx`, borrar `components/auth-form.tsx` y añadir `.field-error` y `.auth-msg`. El enlace a `/registro` da 404 hasta el paso 6. Prueba manual: con un usuario creado a mano en el dashboard (confirmado), entrar y salir funciona y la barra de navegación muestra su nombre.
6. **Registro.** Crear `components/register-form.tsx` y `app/registro/page.tsx`. Prueba manual: registrarse, recibir el correo, pulsar el enlace y acabar en `/juegos` con sesión.
7. **Recuperar contraseña.** Crear `app/recuperar-contrasena/page.tsx` y `app/nueva-contrasena/page.tsx`. Prueba manual: pedir el enlace, fijar una contraseña nueva y entrar con ella.
8. **Nombre fijo en el modal.** Añadir `nameLocked` a `GameOverModal` y pasarlo desde `game-player.tsx`.
9. **Documentación.** Actualizar `CLAUDE.md`.

## Acceptance criteria

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no muestra avisos sobre `profiles`, `handle_new_user` ni `username_available`.
- [ ] Como `anon`, `select * from profiles` no devuelve filas.
- [ ] Registrarse con nombre `kai_99`, un correo nuevo y una contraseña de 8 caracteres muestra "REVISA TU CORREO" y crea la fila `profiles` con `username = 'KAI_99'`.
- [ ] Registrarse con un nombre que ya existe (en cualquier combinación de mayúsculas) muestra "ESE NOMBRE YA ESTÁ EN USO" y no envía correo.
- [ ] Con un nombre de 2 caracteres, uno con espacios o guiones, una contraseña de 7 caracteres o dos contraseñas distintas, el formulario de registro muestra el error bajo el campo y no llama a Supabase.
- [ ] "REENVIAR CORREO" en "REVISA TU CORREO" envía un segundo correo de confirmación.
- [ ] Pulsar el enlace del correo de confirmación lleva a `/juegos` con la sesión iniciada y el nombre en la barra de navegación.
- [ ] Entrar con un correo sin confirmar muestra "CONFIRMA TU CORREO ANTES DE ENTRAR" con el botón "REENVIAR CORREO".
- [ ] Entrar con una contraseña incorrecta muestra "CORREO O CONTRASEÑA INCORRECTOS".
- [ ] Entrar con credenciales correctas lleva a `/juegos` y la sesión sigue tras recargar la página.
- [ ] Con sesión, abrir `/iniciar-sesion` o `/registro` redirige a `/juegos`.
- [ ] Con sesión, la barra de navegación muestra el nombre (sin acción al pulsarlo) y un botón "Cerrar sesión". Pulsar "Cerrar sesión" cierra la sesión, lleva a `/` y la barra vuelve a mostrar "Iniciar sesión".
- [ ] "JUGAR COMO INVITADO" lleva a `/juegos` sin sesión, y en el modal "FIN DEL JUEGO" el nombre es "INVITADO" y se puede editar.
- [ ] Con sesión, el modal "FIN DEL JUEGO" muestra el username en un input de solo lectura y la puntuación se guarda con ese nombre.
- [ ] Con sesión, el Salón de la Fama marca la fila "TÚ" del username.
- [ ] `/recuperar-contrasena` muestra el mismo mensaje con un correo registrado y con uno inexistente.
- [ ] El enlace del correo de recuperación lleva a `/nueva-contrasena`. Guardar una contraseña nueva lleva a `/juegos`, y después se entra con la nueva y no con la antigua.
- [ ] `/nueva-contrasena` sin sesión muestra "EL ENLACE NO ES VÁLIDO O HA CADUCADO".
- [ ] Un enlace de confirmación ya usado lleva a `/iniciar-sesion?error=enlace` con su mensaje.
- [ ] `/auth/confirm?...&next=https://ejemplo.com` redirige a `/juegos`, no a un dominio externo.
- [ ] Los botones GOOGLE y GITHUB aparecen deshabilitados con "PRÓXIMAMENTE".
- [ ] Tras actualizar, `localStorage` ya no contiene `av_user`.
- [ ] Ningún archivo de `app/` ni `components/` importa `components/auth-form.tsx` ni llama a `login()` de `useAuth`.

## Decisions

- **Yes:** Supabase Auth con correo y contraseña. Ya está el cliente `@supabase/ssr` del SPEC 04 y no añade dependencias.
- **Yes:** dos rutas separadas (`/iniciar-sesion` y `/registro`) en vez de las pestañas del prototipo. URLs propias y estados de error más simples.
- **Yes:** tabla `profiles` con `username` único, creada por trigger. `user_metadata` no permite garantizar la unicidad.
- **Yes:** nombre de jugador de 3 a 10 caracteres `A–Z 0–9 _`. Cabe en `scores.name` (máximo 10, mayúsculas) y evita nombres de 1–2 letras y caracteres difíciles de leer en la fuente pixel.
- **Yes:** `username_available` como función `security definer`. `profiles` no es legible por `anon`, y el trigger sigue siendo la garantía final si dos registros compiten por el mismo nombre.
- **Yes:** confirmación por enlace con `token_hash` y `/auth/confirm`. Funciona aunque el enlace se abra en otro navegador (no depende del `code_verifier` de PKCE).
- **Yes:** SMTP por defecto de Supabase. Vale para desarrollo; tiene un límite bajo de correos por hora.
- **No:** SMTP de Resend en este spec. Necesita un dominio verificado; va con el despliegue o en su propio spec.
- **No:** código OTP de 6 dígitos. Añade una pantalla más y el enlace ya cumple la validación por correo.
- **Yes:** las llamadas de Auth (`signInWithPassword`, `signUp`, `resend`, `resetPasswordForEmail`, `updateUser`, `signOut`) se hacen desde el cliente de navegador. Así `onAuthStateChange` actualiza la barra de navegación al momento. El servidor solo interviene en el proxy y en `/auth/confirm`.
- **No:** Server Actions para el login. El cliente de navegador no se entera del cambio de sesión hecho en el servidor sin recargar.
- **Yes:** proxy de sesión en `proxy.ts`. Sin él, los Server Components no pueden refrescar el token (ver el comentario de `lib/supabase/server.ts`).
- **Yes:** iniciar sesión solo con correo. Buscar el correo por nombre expondría si un nombre tiene cuenta y añade otra función `security definer`.
- **Yes:** se mantiene "JUGAR COMO INVITADO". La Home promete "Sin registro obligatorio".
- **Yes:** con sesión, el nombre del modal es fijo. Prepara el spec que ligará `scores` a la cuenta.
- **No:** ligar `scores` a `user_id` en este spec. Cambia la RLS y el modo invitado; va en su propio spec.
- **Yes:** contraseña mínima de 8, en el cliente y en Supabase. El mínimo de Supabase es la garantía real.
- **Yes:** el estado "REVISA TU CORREO" vive dentro de `/registro`. No hace falta una ruta más.
- **Yes:** `/recuperar-contrasena` responde igual exista o no el correo. No revela qué correos tienen cuenta.
- **Yes:** `useAuth().user` conserva la forma `{ name }`. `hall-of-fame.tsx` y `game-player.tsx` siguen funcionando sin cambios de tipo.
- **No:** menú desplegable en la barra de navegación. Un botón "Cerrar sesión" junto al nombre basta.
- **Yes:** nombre y "Cerrar sesión" separados en escritorio, como en el menú móvil (cambio pedido durante la implementación). Que el nombre cerrara la sesión al pulsarlo no se entendía.
- **Yes:** Google y GitHub en el SPEC 15. Los botones quedan deshabilitados con "PRÓXIMAMENTE" para no perder el diseño.

## Risks

| Risk                                                                                                                                                                                                                                               | Mitigation                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El SMTP por defecto de Supabase limita los correos por hora y las pruebas de registro, reenvío y recuperación lo agotan rápido                                                                                                                     | Probar con pocos correos; los usuarios de prueba se pueden confirmar a mano en el dashboard. SMTP propio fuera de alcance.                                                                                                                                                                                                                                                               |
| Con la protección contra enumeración, `signUp` con un correo ya registrado no devuelve error                                                                                                                                                       | Se muestra "REVISA TU CORREO" igual; es el comportamiento buscado. El nombre ya se comprobó antes.                                                                                                                                                                                                                                                                                       |
| Un registro sin confirmar reserva el nombre para siempre                                                                                                                                                                                           | Aceptado en este spec. Liberar nombres de cuentas no confirmadas va con la gestión de cuentas.                                                                                                                                                                                                                                                                                           |
| Un invitado puede guardar puntuaciones con el nombre de un usuario registrado                                                                                                                                                                      | Aceptado: `scores` no cambia. Lo resuelve el spec que ligue `scores` a `user_id`.                                                                                                                                                                                                                                                                                                        |
| El error del trigger (nombre duplicado en una carrera) llega como "Database error saving new user"                                                                                                                                                 | El formulario lo muestra como "ESE NOMBRE YA ESTÁ EN USO".                                                                                                                                                                                                                                                                                                                               |
| Las plantillas y URLs del dashboard no están en el repositorio                                                                                                                                                                                     | Paso 2 del plan las documenta y `config.toml` refleja los valores locales. Al desplegar, añadir la URL de producción.                                                                                                                                                                                                                                                                    |
| En el plan gratuito de Supabase no se pueden editar las plantillas de correo con el SMTP por defecto (comprobado durante la implementación). El enlace por defecto pasa por Supabase y llega a `/auth/confirm` con `?code=` en vez de `token_hash` | Aceptado por ahora. Al confirmar, el correo queda confirmado igualmente y se puede iniciar sesión, pero la app muestra "EL ENLACE NO ES VÁLIDO O HA CADUCADO". La recuperación de contraseña no funciona: el enlace no deja sesión y `/nueva-contrasena` muestra el mismo error. Se resuelve con SMTP propio (plantillas editables) o aceptando `code` en `/auth/confirm`, en otro spec. |

## What is **not** in this spec

- Google y GitHub (SPEC 15).
- `scores.user_id`, RLS solo para autenticados y nombres reservados frente a invitados.
- Perfil, cambio de nombre o correo, borrado de cuenta.
- Menú desplegable de sesión.
- SMTP propio.
- Rutas protegidas.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
