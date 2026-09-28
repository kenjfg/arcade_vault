# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online games platform where players compete for the highest score. The README (in Spanish) says the project follows spec-driven design (`/spec` and `/spec-impl`) using the skills from `Klerith/fernando-skills` (installed with `npx skills@latest add Klerith/fernando-skills`).

The repo is currently the untouched `create-next-app` scaffold: `app/page.tsx` is the default template page and `app/layout.tsx` still has the "Create Next App" metadata. No games, scoring, auth, database, or tests exist yet.

## Spec-driven workflow

Features are built through two user-invoked skills (`disable-model-invocation: true`, so run them only when the user types the command). They live in `.agents/skills/` and are symlinked into `.claude/skills/`; `skills-lock.json` pins their source.

- `/spec <feature description>`: produces a spec, writes no code. It reads this file, asks clarifying questions in blocks of 3-5, then saves `specs/NN-slug.md` (next sequential number, kebab-case slug) with status `Draft`, and stops without offering to implement. It also seeds `specs/.spec-config.yml` if missing. It replies in the language of the prompt, and new specs must match the language and state wording of the existing ones.
- `/spec-impl <NN-slug | NN | slug>`: implements a spec. It refuses unless the status means "Approved" (`Approved`/`Aprobado`, etc.); only the human changes Draft to Approved, and the agent must never do it. It then creates and switches to git branch `spec-NN-slug` (skipped or confirmed via `[y/N]` when `AutoCreateBranch: false` in `specs/.spec-config.yml`), and warns first if the working tree is dirty.

Rules that apply while implementing a spec:
- Implement the numbered plan exactly, one step at a time, and pause after each step for the user to review the diff.
- Never commit automatically. Committing is the user's call.
- If the spec looks suboptimal, say so but implement what was agreed. Ambiguities, and requests outside the spec's scope, are raised with the user (or deferred to a later spec) rather than resolved by improvising on the branch.
- When all steps are done, the acceptance criteria are checked by hand and the user then sets the status to `Implemented`.

Spec format (`.agents/skills/spec/template.md`): a blockquote header (`Status`, `Depends on`, `Date`, one-sentence `Objective`), then Scope (with explicit "Out"), Data model, Implementation plan (each step leaves the app runnable and is committable alone), boolean Acceptance criteria, Decisions (taken and discarded, with reasons), optional Risks, and a closing "What is not in this spec". Valid statuses: Draft, In review, Approved, Implemented, Obsolete. No TODOs and no long code in specs.

`specs/` does not exist yet, so the first spec will be `01-...`.

## UI reference prototype

`references/templates/` holds a static, Spanish-language prototype of the intended UI ("Arcade Vault · Portal Retro"): a retro/neon arcade portal. It is a design reference, not app code: it runs in the browser via CDN React 18 and in-browser Babel (`Arcade Vault.html` loads the `.jsx` files as plain scripts) and is styled by a single `styles.css`. It shows the planned screens: game library (`biblioteca`), game detail (`detalle`), player (`reproductor`), auth, hall of fame (`salon`), and nav, all fed by mock data in `data.jsx` (`GAMES`, seeded scores). When a spec builds these screens in the Next.js app, port the design from here rather than copying the CDN/Babel setup.

## Commands

```bash
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint (flat config); run `npx eslint <path>` for a single file
npx tsc --noEmit  # type check (no script defined)
```

There is no test runner configured.

## Stack and architecture

- Next.js 16.3.5 (App Router, `app/` at the repo root, no `src/`), React 19, TypeScript strict, Tailwind CSS v4.
- Per `AGENTS.md`, this Next.js version differs from what you may know. Read the matching guide under `node_modules/next/dist/docs/01-app/` before writing Next code.
- Tailwind v4 is configured in CSS, not a JS config: `app/globals.css` does `@import "tailwindcss"` and maps the `--background`/`--foreground` CSS variables and the Geist font variables into the theme with `@theme inline`. Dark mode follows `prefers-color-scheme`. PostCSS uses `@tailwindcss/postcss` (`postcss.config.mjs`).
- `app/layout.tsx` types its props with the globally available `LayoutProps<"/">` helper (generated route types), not a hand-written props type. Fonts (Geist, Geist Mono) are loaded via `next/font/google` and exposed as CSS variables on `<html>`.
- Path alias: `@/*` resolves to the repo root (not `src/`).
- ESLint uses `eslint-config-next` `core-web-vitals` + `typescript` presets; `.next/**`, `out/**`, `build/**`, and `next-env.d.ts` are ignored.
