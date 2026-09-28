# SPEC 03 — Acerca de y formulario de contacto con envío real

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-28
> **Objective:** Portar a `/acerca` la pantalla de `references/templates/home-about/about.jsx` con fidelidad visual exacta, haciendo que su formulario de contacto envíe un correo real al equipo mediante una Server Action y Resend.

## Scope

**In:**

- Nueva pantalla en `/acerca` (`app/acerca/page.tsx`), port exacto de `about.jsx`:
  - Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", texto de misión y tres highlights con iconos pixel (`HEART`, `BROWSER`, `PLANT`).
  - Divisor con barras y 24 píxeles parpadeantes.
  - Contacto: intro ("CONTÁCTANOS", texto y tres tips con LED) y formulario (nombre, correo, mensaje, botón "▶  ENVIAR MENSAJE").
  - Animación de aparición al hacer scroll en el divisor y el bloque de contacto, reutilizando `RevealOnScroll` (SPEC 02).
- Envío real del formulario:
  - Server Action `sendContactMessage` que valida los datos y envía el correo con el SDK oficial `resend`.
  - El correo llega a `CONTACT_TO_EMAIL`, sale de `RESEND_FROM_EMAIL` y lleva `reply-to` con el correo del jugador.
  - Formato texto plano, con asunto `[Arcade Vault] Mensaje de <nombre>` y un cuerpo con nombre, correo y mensaje.
- Estados del formulario:
  - **Validación en cliente**, igual que la referencia: si algún campo está vacío (tras `trim`), el formulario tiembla y no se envía nada.
  - **Enviando**: el botón muestra "ENVIANDO…" y queda deshabilitado; el formulario sigue visible.
  - **Éxito**: la terminal "VAULT-OS // TERMINAL" con los textos exactos de la referencia; "ENVIAR OTRO MENSAJE" limpia los campos y vuelve al formulario.
  - **Error** (fallo de Resend o configuración ausente): la misma terminal en modo error; "REINTENTAR" vuelve al formulario conservando lo escrito. Sus líneas son:
    - `vault@arcade:~$ ./send_message --to=team` (igual que en éxito)
    - `[OK] Conectando con servidor…` (atenuada)
    - `[ERROR] No se pudo transmitir el paquete.` (magenta)
    - `> MENSAJE NO ENVIADO. INTÉNTALO DE NUEVO EN UNOS MINUTOS.` con cursor `_` parpadeante (magenta)
    - Botón ghost "REINTENTAR"
  - **Validación en servidor fallida**: el formulario tiembla, igual que la validación en cliente.
- Validación en servidor: los tres campos no vacíos tras `trim`, formato de correo válido y longitudes máximas (nombre ≤ 60, correo ≤ 254, mensaje ≤ 2000).
- Anti-spam con campo trampa (honeypot) oculto: si llega relleno, se responde éxito sin llamar a Resend.
- Configuración:
  - Variables `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `RESEND_FROM_EMAIL`, documentadas en un `.env.example` versionado (excepción `!.env.example` en `.gitignore`).
  - `RESEND_FROM_EMAIL` es opcional y por defecto vale `Arcade Vault <onboarding@resend.dev>`.
- Nav: link "Acerca de" (`/acerca`) después de "Salón de la Fama", en escritorio y en el menú móvil, activo solo en `/acerca`.
- Port a `app/globals.css` del bloque `ABOUT PAGE` de `references/templates/home-about/styles.css`, más las reglas mínimas del modo error de la terminal.

**Out of scope (for future specs):**

- Correo de confirmación al remitente.
- Correo en HTML o con plantilla con estilo.
- Límite de envíos por IP, CAPTCHA u otra protección anti-spam además del honeypot.
- Guardar los mensajes (base de datos, `localStorage` o log persistente).
- Verificación de un dominio propio en Resend (solo se deja preparada la variable `RESEND_FROM_EMAIL`).
- Enlaces a `/acerca` desde el Home o el footer.
- El tamaño de las flechas y otros glifos por la fuente de respaldo de `next/font` (pendiente del SPEC 02).

## Data model

No hay persistencia. Se introducen solo tipos y configuración.

Estado que devuelve la Server Action (`app/acerca/actions.ts`), consumido por `useActionState`:

```ts
export type ContactState =
  | { status: "idle" }
  | { status: "sent"; name: string } // name ya con trim, para "GRACIAS, <NAME>."
  | { status: "invalid" }            // validación en servidor fallida → shake
  | { status: "error" };             // Resend falló o falta configuración
```

Campos del `FormData` que recibe la acción: `name`, `email`, `msg` y `website` (honeypot; debe llegar vacío).

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

| Variable | Obligatoria | Uso |
|---|---|---|
| `RESEND_API_KEY` | Sí | API key de Resend |
| `CONTACT_TO_EMAIL` | Sí | Destinatario de los mensajes |
| `RESEND_FROM_EMAIL` | No | Remitente; por defecto `Arcade Vault <onboarding@resend.dev>` |

Convenciones:

- Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, la acción devuelve `{ status: "error" }` y registra en el servidor qué variable falta. La app arranca y funciona igual sin ellas.
- Si el honeypot llega relleno, la acción devuelve `{ status: "sent", name }`, no llama a Resend y registra `[contact] honeypot` en el servidor.

## Implementation plan

1. Portar a `app/globals.css`, dentro de `@layer components`, el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (hero, highlights, divisor, contacto, formulario, `shake`, `.btn.press` y terminal). Añadir las reglas del modo error de la terminal: borde y sombra magenta en `.terminal-success.is-error` y color magenta en `.term-body .line.error`. La app se ve igual que antes.
2. Crear `components/highlight-icon.tsx` (3 iconos pixel) y `components/contact-form.tsx` (Client Component con campos controlados, shake y terminal de éxito, de momento simulado como la referencia). Crear `app/acerca/page.tsx` (Server Component con `<RevealOnScroll />`, hero, highlights, divisor e intro de contacto) y añadir "Acerca de" al nav. `/acerca` queda visualmente completa y se comporta exactamente como la referencia.
3. Instalar `resend`. Crear `.env.example` con las tres variables, añadir `!.env.example` a `.gitignore` y crear `app/acerca/actions.ts` (`'use server'`) con `sendContactMessage(prevState, formData)`: honeypot, validación, comprobación de configuración, envío con Resend y retorno de `ContactState`. Aún no se usa desde la UI.
4. Conectar `contact-form.tsx` a `sendContactMessage` con `useActionState`: el botón muestra "ENVIANDO…" mientras `pending`, el honeypot oculto se envía con el formulario, `invalid` hace temblar el formulario, `sent` muestra la terminal de éxito y `error` la terminal en modo error con "REINTENTAR". La validación en cliente se mantiene antes de llamar a la acción.
5. QA:
   - Visual: comparar `/acerca` contra `references/templates/home-about/arcade-vault-standalone.html` en escritorio y a 375px.
   - Envío: un correo real de extremo a extremo con `.env.local` configurado, el caso sin variables, el caso con honeypot relleno y el caso con un correo mal formado enviado directamente a la acción.
   - `npx tsc --noEmit` y `npm run lint`.

## Acceptance criteria

- [x] `/acerca` muestra hero, tres highlights, divisor y bloque de contacto con los textos exactos de `about.jsx`.
- [x] El divisor y el bloque de contacto empiezan ocultos y aparecen al entrar en el viewport.
- [x] Enviar con algún campo vacío (o solo espacios) hace temblar el formulario y no llama a la Server Action.
- [x] Mientras se envía, el botón muestra "ENVIANDO…" y está deshabilitado.
- [x] Con `.env.local` configurado, un envío válido hace llegar un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>`, cuerpo en texto plano con nombre, correo y mensaje, y `reply-to` igual al correo del jugador.
- [x] Tras un envío correcto se ve la terminal de éxito con "GRACIAS, <NOMBRE EN MAYÚSCULAS>." y el cursor parpadeando; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [x] Sin `RESEND_API_KEY` o sin `CONTACT_TO_EMAIL`, enviar muestra la terminal en modo error (borde magenta, líneas `[ERROR]`) y el servidor registra qué variable falta; la app no falla al arrancar.
- [x] "REINTENTAR" vuelve al formulario con el nombre, el correo y el mensaje que se habían escrito.
- [x] Con el honeypot relleno, la respuesta es la terminal de éxito, no se llama a Resend y el servidor registra `[contact] honeypot`.
- [x] La acción rechaza (`invalid`, el formulario tiembla) un correo sin formato válido o campos que superen 60 / 254 / 2000 caracteres.
- [x] `RESEND_API_KEY` no aparece en ningún bundle de cliente (solo se lee en `app/acerca/actions.ts`).
- [x] `.env.example` está versionado con las tres variables y sin valores secretos; `.env.local` sigue ignorado.
- [x] El nav (escritorio y móvil) muestra "Acerca de" después de "Salón de la Fama", activo solo en `/acerca`.
- [x] Breakpoints de la referencia: highlights en una columna bajo 820px, contacto en una columna bajo 900px, y sin scroll horizontal a 375px.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.

## Decisions

- **Yes:** envío real con Resend desde una Server Action. Es el patrón de mutación de esta versión de Next (`'use server'` + `useActionState`), no necesita una API pública propia y Resend tiene plan gratuito.
- **No:** SMTP con Nodemailer. Más configuración y la entrega es menos fiable.
- **No:** envío simulado como la referencia. El usuario pidió explícitamente un envío de correo real.
- **Yes:** SDK oficial `resend`. API tipada con `{ data, error }`; compensa la dependencia nueva.
- **No:** `fetch` directo a la API REST. Tipos y errores a mano sin ganancia real.
- **Yes:** ruta `/acerca`. Decisión del usuario; corta y en español.
- **No:** `/acerca-de` ni `/about`.
- **Yes:** solo un correo al equipo (`CONTACT_TO_EMAIL`) con `reply-to` al jugador. Se puede responder directamente sin exponer un envío hacia terceros.
- **No:** acuse de recibo al remitente. Requiere dominio verificado y permitiría usar el formulario para enviar correos a cualquiera.
- **Yes:** texto plano. Sin riesgo de inyectar HTML y sin plantilla que mantener.
- **Yes:** botón "ENVIANDO…" deshabilitado mientras se envía. Es el cambio mínimo respecto a la referencia, y la terminal solo aparece con un resultado real.
- **No:** terminal inmediata con líneas progresivas. Las líneas `[OK]` fingirían pasos que no se están comprobando.
- **Yes:** terminal en modo error con "REINTENTAR" que conserva lo escrito. Mantiene la estética y no hace perder el mensaje.
- **No:** mensaje de error bajo el botón. Menos coherente con el diseño retro.
- **Yes:** validación en servidor (no vacíos, formato de correo, longitudes 60 / 254 / 2000) sin librerías nuevas. Nunca se confía solo en la del cliente.
- **Yes:** mantener la validación en cliente de la referencia (campos vacíos → shake) y el `type="email"` nativo del input. Calco exacto del comportamiento visible.
- **Yes:** honeypot como anti-spam. Invisible y sin coste.
- **No:** límite de envíos por IP en memoria. No funciona de forma fiable en serverless; si hace falta, va en otro spec.
- **Yes:** `RESEND_FROM_EMAIL` opcional con `onboarding@resend.dev` por defecto. Funciona sin dominio verificado mientras `CONTACT_TO_EMAIL` sea el correo de la cuenta de Resend.
- **Yes:** configuración ausente → terminal de error + log en el servidor. Una mala configuración se detecta en vez de ocultarse.
- **No:** simular éxito en desarrollo cuando faltan las claves. Ocultaría la mala configuración.
- **Yes:** `.env.example` versionado con excepción en `.gitignore`. Documentación junto al código.
- **Yes:** campos controlados en el cliente, igual que la referencia, en lugar de un formulario no controlado. Así "REINTENTAR" conserva lo escrito y React no reinicia los campos tras la acción.
- **Yes:** reutilizar `RevealOnScroll` (SPEC 02) en vez de duplicar el `useEffect` de `about.jsx`.
- **Yes:** modo error como modificador de la terminal existente (`.is-error`, `.line.error`). Es el único CSS que no viene de la referencia, porque la referencia no tiene estado de error.
- **Yes:** plan en dos fases (primero la pantalla simulada, luego el envío real). Cada paso deja la app funcional y se puede revisar la fidelidad visual antes de tocar el backend.

## Risks

- **Restricción del sandbox de Resend:** con `onboarding@resend.dev` solo se puede enviar al correo de la cuenta de Resend. Si `CONTACT_TO_EMAIL` es otra dirección, Resend devuelve error y se verá la terminal de error. Queda documentado en `.env.example`.
- **Fuga de la API key:** si `RESEND_API_KEY` se importa desde un módulo de cliente o lleva prefijo `NEXT_PUBLIC_`, acabaría en el bundle. Solo se lee dentro de `app/acerca/actions.ts` (`'use server'`).
- **Spam o abuso:** el honeypot frena bots simples, no ataques dirigidos. Si llega spam, hará falta un límite de envíos o un CAPTCHA en otro spec.
- **Choque de estilos:** clases genéricas del bloque ABOUT (`.highlight`, `.tip`, `.field` ya existente en auth) podrían afectar a otras pantallas. Hay que revisar Auth y Salón tras el paso 1.
- **Doble envío:** si el botón no se deshabilita a tiempo, un doble clic podría mandar dos correos. El botón queda deshabilitado mientras `pending`.

## What is **not** in this spec

- Acuse de recibo al remitente, correos en HTML o plantillas.
- Límite de envíos, CAPTCHA u otras defensas anti-spam además del honeypot.
- Almacenar los mensajes recibidos.
- Verificar un dominio propio en Resend.
- Enlaces a `/acerca` fuera del nav.
- Corregir la fuente de respaldo de `next/font` para `→`, `▼` y otros glifos.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
