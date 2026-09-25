# Bot Garden

A personal Fate/Grand Order style visual novel chat. You type your own replies; AI characters answer with dialogue, narration and sprite expression changes.

- Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- Prisma 7 + PostgreSQL (Supabase)
- Any OpenAI-compatible chat API, streamed. The API key stays on the server.
- Supabase Storage for uploaded sprite sheets and backgrounds

## Local setup

1. Install Node.js 20.9 or newer.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy the env file and fill it in:
   ```bash
   cp .env.example .env
   ```
   - For local development, `DATABASE_URL` and `DIRECT_URL` can both point at a local Postgres.
   - Leave the `SUPABASE_*` values empty to store uploads in `public/uploads/`.
4. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
5. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```

Checks: `npm test` (parser, lorebook, prompt, summary, SSE), `npm run typecheck`, `npm run lint`.

## Deploy to Vercel with Supabase

1. Create a Supabase project.
   - **Project Settings → Database → Connection string.** Copy the *transaction pooler* URL (port 6543) for `DATABASE_URL`, and the *direct* or *session* URL (port 5432) for `DIRECT_URL`.
   - **Project Settings → API.** Copy the project URL (`SUPABASE_URL`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`). This key is secret and stays on the server.
2. Run the migrations against Supabase once from your computer, with `DIRECT_URL` pointing at Supabase:
   ```bash
   npx prisma migrate deploy
   ```
   Run this again whenever you pull a change that adds a migration.
3. Import the repository in Vercel and add every variable from `.env.example` under **Settings → Environment Variables**.
4. Deploy. On the first upload, the app creates a public Storage bucket named `SUPABASE_BUCKET` (default `assets`).

Notes:
- Vercel limits request bodies to 4.5 MB. The editor re-encodes sprite sheets larger than about 3.8 MB as WebP before upload.
- The chat route allows up to 60 seconds per reply (`maxDuration`).
- The login throttle is kept in memory per server instance. It slows guessing but is not a full rate limiter.
- Keep the GitHub repository private if you commit FGO art to `public/assets/`.

## Sprite sheets

Every character uses the FGO sheet layout:

```
┌──────────────────────────────┐
│ body (1024 × 768)            │  full body with a face drawn in
├───────┬───────┬───────┬──────┤
│ face  │ face  │ face  │ face │  256 × 256 cells, 4 per row
│ …     │       │       │      │
└───────┴───────┴───────┴──────┘
```

In **Characters → your bot → Sprites**, upload a sheet or enter a path such as `/assets/sprites/bb/ascension1.webp`. The editor:
- counts the face cells,
- finds where the face sits on the body (auto-align; drag or use the arrows to adjust),
- lets you assign a face cell to each expression, with a live preview.

Every character has a `neutral` expression. Unknown expressions fall back to it.

## AI output format

The system prompt asks the model to reply line by line:

```
[Name|expression] Dialogue text
(narration) Narration text
{scene:background_id}
{enter:Name:left|center|right}
{exit:Name}
```

- An unknown expression uses `neutral` (and shows a warning in dev mode).
- An unknown character or background command is ignored. The text is kept.
- A line with no tag is dialogue from the last speaker.
- A line written for your own persona is dropped.
- **Dialogue mode** shows only dialogue from the main character.

## Other features

- **Stage:** click, tap, Space or Enter to advance. Auto and Skip modes. The Log shows the whole story; you can edit or delete any message there.
- **Regenerate:** keeps every version. Use ‹ › to switch between them.
- **Saves:** 10 slots per story. Loading replaces the story after that point.
- **Persona:** your name, how characters address you, and a short description. Inserted as `{{user}}`.
- **Lorebook:** an entry is added to the prompt when a keyword appears in recent messages. The matching code is in `src/lib/lorebook/` behind a `LoreProvider` interface, so an external lorebook can be plugged in later.
- **Memory:** when the history gets longer than the budget in Settings, older messages are summarized and the summary is sent instead.
- **Appearance:** four color themes plus a custom background color, and four fonts: Clear (Atkinson Hyperlegible Next), Plain (Inter), Rounded (Nunito) and Dyslexic (OpenDyslexic).

## Project layout

```
prisma/                 schema and migrations
src/app/                pages, server actions, API routes (chat, uploads, login)
src/components/stage/   the visual novel screen
src/components/editor/  character editor and sprite tools
src/lib/parser/         output parser (unit tested)
src/lib/stage/          stage state and beats
src/lib/prompt/         prompt builder and rules
src/lib/lorebook/       keyword matching and providers
src/lib/summary/        history summarization
```
