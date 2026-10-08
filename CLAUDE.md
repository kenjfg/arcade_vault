# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online games platform where players compete for the highest score. The UI is in Spanish (retro/neon "Portal Retro" style). The README (in Spanish) says the project follows spec-driven design (`/spec` and `/spec-impl`) using the skills from `Klerith/fernando-skills` (installed with `npx skills@latest add Klerith/fernando-skills`).

Current state (specs 01–09, all `Implemented`):

- Screens ported from the prototype: Home `/`, library `/juegos`, game detail `/juegos/[id]`, player `/juegos/[id]/jugar`, auth `/iniciar-sesion`, Hall of Fame `/salon-de-la-fama`, About + contact form `/acerca`.
- Catalog, categories and scores live in Supabase (SPEC 04/06).
- Four real, playable games with leaderboard: Asteroids (05), Tetris (07), Arkanoid (08), Snake (09). The remaining catalog rows are mocks: the player runs a simulated score for them that cannot be saved.
- Contact form sends real email through Resend (SPEC 03).
- Auth is still simulated: `lib/auth-context.tsx` keeps a `{ name }` user in `localStorage` (`av_user`). There is no Supabase Auth yet, so anyone can submit a score.
- No tests.

## Spec-driven workflow

Features are built through user-invoked skills (`disable-model-invocation: true`, so run them only when the user types the command). `/spec` and `/spec-impl` live in `.agents/skills/` and are symlinked into `.claude/skills/`; `skills-lock.json` pins their source.

- `/spec <feature description>`: produces a spec, writes no code. It reads this file, asks clarifying questions in blocks of 3-5, then saves `specs/NN-slug.md` (next sequential number, kebab-case slug) with status `Draft`, and stops without offering to implement. It replies in the language of the prompt, and new specs must match the language and state wording of the existing ones (Spanish body, English header keys and status values, e.g. `> **Status:** Draft`).
- `/spec-impl <NN-slug | NN | slug>`: implements a spec. It refuses unless the status means "Approved" (`Approved`/`Aprobado`, etc.); only the human changes Draft to Approved, and the agent must never do it. It then creates and switches to git branch `spec-NN-slug` (`AutoCreateBranch: true` in `specs/.spec-config.yml`; `false` would ask `[y/N]`), and warns first if the working tree is dirty.
- `/game-spec <reference folder | game description>`: project-local skill in `.claude/skills/game-spec/` (not in `.agents/skills/` or `skills-lock.json`). A `/spec` specialized for adding a playable game with its leaderboard: ports a game from `references/started-games/` or designs one from scratch, asks about mock conversion, catalog row, HUD mapping and mechanics, and saves `specs/NN-juego-<code>.md` as `Draft`. Its `playbook.md` holds the pattern from SPEC 05/06 (engine contract, canvas component, game registry, migration, base acceptance criteria). Implement the result with `/spec-impl`.

Rules that apply while implementing a spec:

- Implement the numbered plan exactly, one step at a time, and pause after each step for the user to review the diff.
- Never commit automatically. Committing is the user's call.
- If the spec looks suboptimal, say so but implement what was agreed. Ambiguities, and requests outside the spec's scope, are raised with the user (or deferred to a later spec) rather than resolved by improvising on the branch.
- When all steps are done, the acceptance criteria are checked by hand and the user then sets the status to `Implemented`. Each spec is merged to `master` through a PR from its `spec-NN-slug` branch.

Spec format (`.agents/skills/spec/template.md`): a blockquote header (`Status`, `Depends on`, `Date`, one-sentence `Objective`), then Scope (with explicit "Out"), Data model, Implementation plan (each step leaves the app runnable and is committable alone), boolean Acceptance criteria, Decisions (taken and discarded, with reasons), optional Risks, and a closing "What is not in this spec". Valid statuses: Draft, In review, Approved, Implemented, Obsolete. No TODOs and no long code in specs.

The next spec is `10-...`.

## References (design and source material, not app code)

- `references/templates/`: static Spanish prototype of the UI (CDN React 18 + in-browser Babel, one `styles.css`, mock data in `data.jsx`). `home-about/` holds the Home and About designs. Port the design from here rather than copying the CDN/Babel setup. Its styles were ported into `app/globals.css`.
- `references/started-games/NN-<game>/`: standalone vanilla-JS canvas games (`game.js`, `index.html`) used as the source when porting a game (Asteroids, Tetris, Arkanoid so far).
- `references/source-assets/`: art for games designed from scratch (e.g. `snake-assets/` fruit sprites).
- `demos/` is scratch and not part of the app.

## Commands

```bash
npm run dev       # dev server (http://localhost:3000)
npm run build     # production build
npm run start     # serve the production build
npm run lint      # ESLint (flat config); run `npx eslint <path>` for a single file
npx tsc --noEmit  # type check (no script defined)
npm run db:types  # regenerate lib/supabase/database.types.ts from the linked Supabase project

npx supabase migration new <name>  # new file in supabase/migrations/
npx supabase db push               # apply pending migrations to the linked project
```

There is no test runner configured.

A PostToolUse hook (`.claude/settings.json` → `.claude/hooks/format-lint.mjs`) runs Prettier on edited `.tsx/.jsx/.md/.mdx` files and `eslint --fix` on `.tsx/.jsx`; it exits 2 with the errors when something remains, so fix them before moving on.

## Environment

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public by design; never put the secret key (`sb_secret_...`) here.
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, optional `RESEND_FROM_EMAIL`: server-only, never prefix with `NEXT_PUBLIC_`.

`.mcp.json` configures the Supabase MCP server for the project (`tooomjvkfhxfqgmjsctk`). Use it to inspect tables, run `get_advisors`, and read logs, but schema changes go through CLI migrations, never only through the MCP or the dashboard.

## Stack and architecture

- Next.js 16.3.5 (App Router, `app/` at the repo root, no `src/`), React 19, TypeScript strict, Tailwind CSS v4, Supabase (`@supabase/ssr`), Resend.
- Per `AGENTS.md`, this Next.js version differs from what you may know. Read the matching guide under `node_modules/next/dist/docs/01-app/` before writing Next code.
- Path alias: `@/*` resolves to the repo root.
- Pages and layouts type props with the global generated helpers (`LayoutProps<"/">`, `PageProps<"/juegos/[id]/jugar">`), and `params` is a Promise to `await`. The `[id]` segment carries the game's `code` (e.g. `asteroids`), not its numeric id.

### Styling

- `app/globals.css` does `@import "tailwindcss"` and holds the whole retro theme ported from `references/templates/styles.css`: CSS variables (`--bg`, `--ink`, `--cyan`, `--magenta`, `--line`, `--pixel`, `--mono`, ...) mapped into Tailwind with `@theme inline`, and the vanilla `av-*` classes kept in Tailwind layers so utilities still win.
- Fonts (Press Start 2P, JetBrains Mono, Courier Prime) load via `next/font/google` in `app/layout.tsx` as CSS variables. The layout also wraps everything in `AuthProvider` and renders `Nav` and the footer.

### Data (Supabase)

- `lib/supabase/server.ts` (`createClient()`, async, per request, cookie-bound) for Server Components/Functions/Route Handlers; `lib/supabase/client.ts` for Client Components. Both are typed with `Database` from `lib/supabase/database.types.ts` (generated; don't hand-edit, run `npm run db:types`).
- Schema (`supabase/migrations/`): tables `categories`, `games` (`code` unique slug, `color` in cyan/magenta/yellow/green, `playable`, unique `sort_order`), `scores` (name 1–10 chars, score 0–10 000 000); views `leaderboard` (with `rank`) and `game_stats` (`plays`, `best`), both `security_invoker`. RLS: everything is readable by anon; anon can only insert scores for playable games. Converting a mock into a real game is an UPDATE migration of its row (`convert_<mock>_to_<code>`).
- `lib/games-data.ts`: shared types (`Game`, `GameWithStats`, `Category`, `ScoreRow`) and `formatScoreDate`. `lib/games-db.ts`: server-only reads (`getGames`, `getGame`, `getCategories`, `getLeaderboard`); stats failures degrade to "RANKING NO DISPONIBLE" instead of throwing.
- `submitScore` (`app/juegos/[id]/jugar/actions.ts`) is the only write: it re-validates name/score/playable and revalidates the affected pages. `app/api/health/route.ts` checks the Supabase connection.
- The Hall of Fame reads the simulated user's "TÚ" row from the browser with the client Supabase client.

### Games

- Each game is an engine in `lib/games/<code>/` (`constants.ts`, `engine.ts`, plus e.g. `entities.ts` or `levels.ts`) that knows nothing about React: `create<Name>Game(canvas, callbacks)` drives the loop/input/phases and reports through `onStats`/`onGameOver`.
- A canvas component in `components/games/<code>-canvas.tsx` wraps the engine and implements `GameCanvasProps` / `GameCanvasHandle` (`end`, `restart`).
- `components/games/registry.ts` maps `games.code` to the component and its initial HUD stats (`lives: null` hides VIDAS). `components/game-player.tsx` mounts the real game only when the code is registered **and** the row is `playable`; otherwise it falls back to the simulation, and `GameOverModal` only offers saving for real games.
- Adding a game needs no leaderboard changes: a migration for the row, the engine, the canvas component, and a registry entry (see `.claude/skills/game-spec/playbook.md`).
