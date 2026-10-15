# SPEC 15 — Inicio de sesión con Google y GitHub

> **Status:** Implemented
> **Depends on:** SPEC 14
> **Date:** 2026-10-15
> **Objective:** Activar los botones GOOGLE y GITHUB de `/iniciar-sesion` con Supabase Auth OAuth, dando a cada cuenta nueva un nombre de jugador automático a partir de los datos del proveedor.

## Why this spec exists

El SPEC 14 dejó los botones GOOGLE y GITHUB deshabilitados con "PRÓXIMAMENTE". Activarlos no basta: el trigger `handle_new_user` del SPEC 14 exige `username` en los metadatos del registro, y Google y GitHub no lo envían, así que hoy un alta por OAuth sería rechazada. Este spec cambia el trigger para que genere el nombre de jugador cuando falta.

El problema de los enlaces de correo del SPEC 14 (llegan a `/auth/confirm` con `?code=` y la recuperación de contraseña no funciona) queda fuera: este spec solo trata OAuth.

## Scope

**In:**

- **Proveedores en Supabase** (paso manual en el dashboard y en cada proveedor):
  - **GitHub:** una OAuth App en GitHub (Settings → Developer settings → OAuth Apps) con Homepage URL `http://localhost:3000` y Authorization callback URL `https://tooomjvkfhxfqgmjsctk.supabase.co/auth/v1/callback`. Su Client ID y Client Secret se ponen en Authentication → Sign In / Providers → GitHub, que se activa.
  - **Google:** un cliente OAuth de tipo "Aplicación web" en Google Cloud Console, con la pantalla de consentimiento configurada y el URI de redirección autorizado `https://tooomjvkfhxfqgmjsctk.supabase.co/auth/v1/callback`. Su Client ID y Client Secret se ponen en Authentication → Sign In / Providers → Google, que se activa.
  - La Redirect URL `http://localhost:3000/**` del SPEC 14 ya cubre `/auth/callback`.
  - Los secretos no entran en el repositorio.
- **`supabase/config.toml`:** secciones `[auth.external.github]` y `[auth.external.google]` con `enabled = true` y `client_id`/`secret` leídos con `env(...)` (`SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`). Solo refleja la configuración para el entorno local.
- **Nombre de jugador automático** (migración nueva que reemplaza `handle_new_user`):
  - Si el registro trae `username` en los metadatos (registro con correo del SPEC 14), el comportamiento no cambia: se usa ese nombre y, si está ocupado o no cumple el formato, el registro falla.
  - Si no lo trae (alta por OAuth), se genera:
    - **Semilla:** GitHub → `raw_user_meta_data ->> 'user_name'` (el login). Google, o GitHub sin `user_name` → la parte del correo antes de la `@`.
    - **Saneado:** mayúsculas, vocales con tilde y diéresis (`ÁÉÍÓÚÀÈÌÒÙÜ`) a su vocal, `Ñ` a `N`, se quita todo lo que no sea `A–Z`, `0–9` o `_`, y se corta a 10 caracteres.
    - Si el resultado tiene 3 caracteres o más y está libre, se usa tal cual (`kenjfg` → `KENJFG`; `kennyfranco672@gmail.com` → `KENNYFRANC`).
    - Si está ocupado: los 6 primeros caracteres + `_` + 3 dígitos al azar (`KENJFG_482`), probando otros dígitos hasta dar con uno libre, como mucho 50 intentos.
    - Si tiene menos de 3 caracteres: base `JUGADOR`, siempre con sufijo (`JUGADO_731`).
    - Si tras 50 intentos no hay nombre libre, la función lanza un error y el alta falla.
  - El nombre generado no se puede cambiar (no hay perfil; va en otro spec).
- **Vinculación de cuentas:** se deja la vinculación automática de Supabase. Si el correo del proveedor está verificado y coincide con una cuenta existente, Supabase añade la identidad a esa cuenta: no se crea usuario nuevo, el trigger no se ejecuta y se mantiene el nombre de jugador.
- **`lib/safe-next.ts`** (nuevo): `safeNext(next)`, que hoy vive dentro de `app/auth/confirm/route.ts`. Lo usan `/auth/confirm` y `/auth/callback`. Sin cambio de comportamiento.
- **`/auth/callback`** (Route Handler `GET`, nuevo): recibe `code` y `next`, llama a `exchangeCodeForSession(code)` con el cliente de servidor y redirige a `safeNext(next)`. Si llega `error` (el usuario canceló en el proveedor), falta `code` o el intercambio falla, redirige a `/iniciar-sesion?error=oauth`.
- **`/iniciar-sesion`:**
  - Los botones "◆ GOOGLE" y "▣ GITHUB" se activan y pierden "· PRÓXIMAMENTE". Al pulsar, llaman a `signInWithOAuth({ provider, options: { redirectTo: <origin>/auth/callback?next=/juegos } })` desde el cliente de navegador.
  - Tras pulsar uno, los dos botones se deshabilitan y el pulsado muestra "CONECTANDO..." hasta que el navegador sale hacia el proveedor.
  - Si `signInWithOAuth` devuelve error, se muestra "NO SE PUDO CONECTAR. INTÉNTALO DE NUEVO" (el mensaje `network` que ya existe) y los botones se reactivan.
  - Con `?error=oauth`, muestra "NO SE PUDO INICIAR SESIÓN. INTÉNTALO DE NUEVO".
  - `app/iniciar-sesion/page.tsx` pasa a `LoginForm` el código de error de la URL (`enlace` u `oauth`) en vez del booleano `linkError`.
- **`/registro`:** sin cambios (sin botones sociales).
- `CLAUDE.md`: Google y GitHub activos, nombre automático, `/auth/callback`; specs 01–15; siguiente spec `16-...`.

**Out of scope (for future specs):**

- Aceptar `?code=` en `/auth/confirm` para arreglar los enlaces de correo y la recuperación de contraseña del SPEC 14.
- Pantalla para elegir o cambiar el nombre de jugador, y página de perfil.
- Botones sociales en `/registro`.
- Desvincular identidades o impedir la vinculación automática.
- Otros proveedores (Discord, Apple, etc.).
- URLs de producción en los proveedores y en Supabase (van con el despliegue).
- Ligar `scores` a la cuenta.

## Data model

No hay tablas ni columnas nuevas. Se reutiliza `public.profiles` del SPEC 14.

Migración `supabase/migrations/<timestamp>_oauth_usernames.sql`:

- **`public.generate_username(p_seed text) returns text`** (`plpgsql`, `volatile`, `security definer`, `set search_path = ''`): aplica el saneado y la resolución de colisiones descritos en Scope y devuelve un nombre libre que cumple `^[A-Z0-9_]{3,10}$`. `execute` revocado a `public`, `anon` y `authenticated`: solo la llama el trigger.
- **`public.handle_new_user()`** con `create or replace`, misma firma y mismo trigger `on_auth_user_created`:

```sql
-- Pseudocódigo del cuerpo
username := new.raw_user_meta_data ->> 'username';
if username is null then
  username := public.generate_username(
    coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1))
  );
end if;
insert into public.profiles (id, username) values (new.id, upper(username));
```

`lib/supabase/database.types.ts` se regenera con `npm run db:types`. No se esperan cambios: `generate_username` no se expone a `anon` ni a `authenticated`, pero el generador incluye todas las funciones de `public`, así que puede aparecer en `Functions`.

Errores de `/iniciar-sesion` (`components/login-form.tsx`):

```ts
type LoginError = "credentials" | "unconfirmed" | "network" | "link" | "oauth";
// oauth: "NO SE PUDO INICIAR SESIÓN. INTÉNTALO DE NUEVO"

interface LoginFormProps {
  urlError: "enlace" | "oauth" | null; // ?error= de la URL
}
```

### Archivos

| Archivo                                               | Cambio                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/migrations/<timestamp>_oauth_usernames.sql` | Nuevo: `generate_username` y `handle_new_user` reemplazada               |
| `lib/supabase/database.types.ts`                      | Regenerado                                                               |
| `supabase/config.toml`                                | `[auth.external.github]` y `[auth.external.google]` con `env(...)`       |
| `lib/safe-next.ts`                                    | Nuevo: `safeNext` movido desde `/auth/confirm`                           |
| `app/auth/confirm/route.ts`                           | Importa `safeNext`                                                       |
| `app/auth/callback/route.ts`                          | Nuevo: `exchangeCodeForSession` y redirección                            |
| `components/login-form.tsx`                           | Botones OAuth activos, estado "CONECTANDO...", error `oauth`, `urlError` |
| `app/iniciar-sesion/page.tsx`                         | Pasa `urlError`                                                          |
| `CLAUDE.md`                                           | OAuth, nombre automático, specs 01–15, siguiente spec `16-...`           |

## Implementation plan

1. **Proveedores.** Crear la OAuth App de GitHub y el cliente OAuth de Google, activar los dos proveedores en el dashboard de Supabase con sus credenciales y añadir las secciones de `supabase/config.toml`. La app no cambia.
2. **Migración.** Crear `<timestamp>_oauth_usernames.sql` con `npx supabase migration new oauth_usernames`, aplicarla con `npx supabase db push`, regenerar los tipos con `npm run db:types` y revisar `get_advisors` (seguridad). Prueba manual con SQL como `postgres`: `generate_username('kenjfg')`, `generate_username('josé.ñúñez')`, `generate_username('a')` y una semilla ya ocupada devuelven nombres válidos. El registro con correo sigue funcionando igual.
3. **`safeNext` compartido.** Crear `lib/safe-next.ts` y hacer que `app/auth/confirm/route.ts` lo importe. Prueba manual: `/auth/confirm` sin parámetros sigue redirigiendo a `/iniciar-sesion?error=enlace`.
4. **Ruta `/auth/callback`.** Crear `app/auth/callback/route.ts`. Prueba manual: `/auth/callback` sin `code` y `/auth/callback?error=access_denied` redirigen a `/iniciar-sesion?error=oauth`.
5. **Botones en `/iniciar-sesion`.** Activar GOOGLE y GITHUB en `components/login-form.tsx` con su estado "CONECTANDO...", añadir el error `oauth` y cambiar `linkError` por `urlError` en el formulario y en `app/iniciar-sesion/page.tsx`. Prueba manual: entrar con GitHub y con Google.
6. **Documentación.** Actualizar `CLAUDE.md`.

## Acceptance criteria

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no muestra avisos nuevos sobre `generate_username` ni `handle_new_user`.
- [ ] Como `anon`, llamar a `generate_username` por RPC devuelve un error de permisos.
- [ ] `generate_username('kenjfg')` devuelve `KENJFG` si está libre.
- [ ] `generate_username('josé.ñúñez')` devuelve `JOSENUNEZ`.
- [ ] Con `KENJFG` ocupado, `generate_username('kenjfg')` devuelve `KENJFG_` seguido de 3 dígitos.
- [ ] `generate_username('a')` devuelve `JUGADO_` seguido de 3 dígitos.
- [ ] En `/iniciar-sesion`, los botones GOOGLE y GITHUB están activos y no muestran "PRÓXIMAMENTE".
- [ ] Pulsar GITHUB con una cuenta de GitHub nueva para la app termina en `/juegos` con sesión y la barra de navegación muestra el login de GitHub en mayúsculas (o su variante con sufijo).
- [ ] Pulsar GOOGLE con una cuenta de Google nueva para la app termina en `/juegos` con sesión y la barra de navegación muestra la parte del correo antes de la `@`, saneada y cortada a 10 (o su variante con sufijo).
- [ ] Al pulsar un botón OAuth, los dos se deshabilitan y el pulsado muestra "CONECTANDO...".
- [ ] Cancelar en la pantalla del proveedor lleva a `/iniciar-sesion` con "NO SE PUDO INICIAR SESIÓN. INTÉNTALO DE NUEVO".
- [ ] Entrar con Google usando el correo de una cuenta de correo y contraseña ya confirmada no crea un usuario nuevo en Authentication → Users y la barra de navegación muestra el nombre que ya tenía esa cuenta.
- [ ] Cerrar la sesión de una cuenta OAuth y volver a entrar con el mismo proveedor mantiene el mismo nombre de jugador.
- [ ] Con sesión OAuth, el modal "FIN DEL JUEGO" muestra el nombre generado en un input de solo lectura.
- [ ] `/auth/callback?code=x&next=https://ejemplo.com` no redirige a un dominio externo.
- [ ] El registro con correo del SPEC 14 sigue creando el perfil con el nombre escrito y rechazando un nombre ocupado con "ESE NOMBRE YA ESTÁ EN USO".
- [ ] `/auth/confirm` sin parámetros sigue redirigiendo a `/iniciar-sesion?error=enlace`.
- [ ] Ningún archivo del repositorio contiene un Client Secret de Google o GitHub.

## Decisions

- **Yes:** nombre de jugador automático a partir del proveedor. Sin pantalla extra en el primer login. A cambio, el nombre puede salir poco legible y no se puede cambiar hasta que exista un perfil.
- **No:** pantalla "elige tu nombre" tras el primer login. Más fricción y una RPC de escritura sobre `profiles`; puede llegar con la página de perfil.
- **Yes:** semilla del login de GitHub y de la parte del correo en Google. Son identificadores y casi siempre ASCII, así que el saneado pierde poco.
- **No:** el nombre de pila (`given_name`, `name`). Más colisiones y más tildes y espacios que quitar.
- **Yes:** colisión resuelta con 6 caracteres + `_` + 3 dígitos al azar. Siempre cabe en 10 y no revela cuántas cuentas comparten base.
- **No:** sufijo secuencial (`KENJFG2`). Predecible y deja ver cuántas cuentas comparten base.
- **Yes:** la generación vive en el trigger (Postgres), no en la app. Es el único sitio que ve todas las altas, venga de donde venga, y comprueba la unicidad en la misma transacción.
- **Yes:** `generate_username` sin `execute` para `anon` ni `authenticated`. Solo la necesita el trigger, y así no suma avisos del advisor.
- **Yes:** vinculación automática de Supabase. Un mismo correo verificado es la misma persona y conserva su nombre.
- **No:** separar siempre las cuentas. Supabase no lo ofrece como opción y bloquearlo a mano añade complejidad sin beneficio.
- **Yes:** ruta propia `/auth/callback` solo para OAuth. El flujo PKCE de OAuth siempre vuelve al mismo navegador, así que `exchangeCodeForSession` funciona.
- **No:** aceptar `code` en `/auth/confirm` en este spec. Arreglaría los enlaces de correo del SPEC 14, pero se decidió tratarlo aparte.
- **Yes:** `safeNext` movido a `lib/safe-next.ts`. Las dos rutas necesitan la misma protección contra redirecciones abiertas.
- **Yes:** botones solo en `/iniciar-sesion`. Es donde ya están; con OAuth, entrar y registrarse son la misma acción.
- **Yes:** error de OAuth mostrado en `/iniciar-sesion?error=oauth`. Sigue el patrón de `?error=enlace` del SPEC 14.
- **Yes:** `signInWithOAuth` desde el cliente de navegador, como el resto de llamadas de Auth del SPEC 14.

## Risks

| Risk                                                                                                         | Mitigation                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos altas simultáneas generan el mismo nombre y una falla por la restricción `unique`                        | Muy improbable con 1 000 sufijos. El alta fallida llega a `/iniciar-sesion?error=oauth`; reintentar genera otro nombre.                           |
| La pantalla de consentimiento de Google en modo "Testing" solo deja entrar a los usuarios de prueba añadidos | Añadir las cuentas de prueba en Google Cloud Console. Publicar la app va con el despliegue.                                                       |
| GitHub sin correo público o sin correo verificado                                                            | Supabase pide el alcance `user:email` y lee el correo principal. Si no está verificado, no hay vinculación automática y se crea una cuenta nueva. |
| Una cuenta de correo sin confirmar y un alta OAuth con el mismo correo                                       | Supabase no vincula con cuentas sin confirmar; el alta OAuth falla o crea otra cuenta según su política. Se documenta lo observado en la prueba.  |
| El nombre generado puede ser poco legible (`KENNYFRANC`)                                                     | Aceptado. Cambiarlo llega con la página de perfil.                                                                                                |
| Las credenciales de los proveedores solo están en el dashboard                                               | El paso 1 documenta dónde se crean. Al desplegar, añadir las URLs de producción en GitHub, Google y Supabase.                                     |

## What is **not** in this spec

- Arreglar los enlaces de correo y la recuperación de contraseña del SPEC 14 (`code` en `/auth/confirm`).
- Elegir o cambiar el nombre de jugador, y página de perfil.
- Botones sociales en `/registro`.
- Desvincular identidades.
- Otros proveedores.
- Configuración de producción.
- `scores.user_id`.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
