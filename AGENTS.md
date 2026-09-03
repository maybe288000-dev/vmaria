# Base44 Dev Environment

## What this is
"Drive Video Hub" (a.k.a. Maria) — a TanStack Start SSR app (Vite + Nitro) using Bun, React 19, Tailwind v4, and a remote Supabase database. Arabic RTL movie/clip platform with an AI chat assistant ("Maria"), Google Drive sync, and an admin panel.

## Running it
```sh
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: host port **3000** (mapped to Vite dev server).
- Runtime image: `oven/bun:1.2`. Source is bind-mounted at `/app`; `bun install` runs on every container start, then `bun run dev` (Vite dev with HMR).
- Health check: `curl -sf http://localhost:3000/`.

## Environment & secrets
- The committed `.env` holds **public** Supabase values (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and their `VITE_` mirrors). These are safe and loaded by both Vite (`import.meta.env`) and compose `env_file`.
- Secrets are delivered via `/run/base44/app.env` (compose `env_file`, listed last so it wins). None are required to **boot** — the page shell renders without them — but data features need them:
  - `SUPABASE_SERVICE_ROLE_KEY` — **required for any video data to load.** Every server function uses `supabaseAdmin` (service-role client, bypasses RLS). Without it, `listPublicVideos` and all data queries fail (page renders empty).
  - `LOVABLE_API_KEY` — Lovable AI gateway + Google Drive connector. Needed for AI description/clip generation, Drive sync, and Maria chat fallback.
  - `GOOGLE_DRIVE_API_KEY` — admin Drive folder sync only.
  - `OPENROUTER_API_KEY` — optional; makes Maria chat use OpenRouter (gpt-4o-mini) instead of the Lovable gateway.

## Vite config note
`vite.config.ts` sets `server.allowedHosts: true` so the Base44 preview proxy (whose hostname changes on every environment recreation) isn't blocked by Vite 7's host check. The Lovable vite-tanstack-config forces `host: "::"` / `port: 8080` in sandbox mode, but CLI flags `--port 3000 --host 0.0.0.0` override to the required port 3000.

## Verifying it works
1. `docker compose -f docker-compose.base44.yml ps` — web should be `healthy`.
2. `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` — must return 200 HTML (external-host check).
3. In the preview: the homepage renders. If `SUPABASE_SERVICE_ROLE_KEY` is set, the video grid populates; otherwise it shows an empty/error state.
