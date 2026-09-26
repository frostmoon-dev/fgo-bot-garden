# Bot Garden

A personal Fate/Grand Order style visual novel chat. You type your own replies; AI characters answer with dialogue, narration and sprite expression changes.

- Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- Prisma 7 + PostgreSQL (Supabase)
- Any OpenAI-compatible chat API (DeepSeek, OpenRouter, Gemini, OpenAI, Claude, Groq, local servers…), streamed. Connect it in the app on the **Connection** page; the API key is stored encrypted and never reaches the browser.
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
   - Supabase requires SSL. Download its CA certificate (Project Settings → Database → SSL Configuration) to `certs/supabase-ca.crt`, or put the PEM text in `DATABASE_CA_CERT` (on Vercel).
4. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
5. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```
6. Sign in, open **Connection**, pick a provider, paste an API key, load the models, **Test**, then **Save**. (The `LLM_*` variables in `.env` also work, as a fallback.)

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
3. Import the repository in Vercel and add these under **Settings → Environment Variables**:

   | Variable | What to put |
   |---|---|
   | `DATABASE_URL`, `DIRECT_URL` | The two Supabase connection strings from step 1. |
   | `DATABASE_CA_CERT` | The *text* of Supabase's CA certificate (open the downloaded `.crt` and paste all of it). The `certs/` folder is not in the repository. |
   | `APP_PASSWORD` | The password you and your friend sign in with. |
   | `AUTH_SECRET` | 32+ random characters (`openssl rand -hex 32`). It also encrypts the saved API key, so don't change it afterwards, or the key has to be entered again. |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | Needed on Vercel: its disk is read-only, so uploads go to Supabase Storage. |
   | `LLM_*` | Optional. Leave them out and connect a model in the app instead. |
4. Make sure the sprite and background images are deployed. Files in `public/assets/` are only on Vercel if they are committed (keep the repository private for FGO art); anything uploaded through the editor goes to Supabase Storage instead.
5. Deploy, sign in, and open **Connection** to connect a model. On the first upload, the app creates a public Storage bucket named `SUPABASE_BUCKET` (default `assets`).

Sharing with a friend: everyone who knows `APP_PASSWORD` shares one account (the same characters, stories and connection), and every reply is billed to the API key saved on the Connection page. If your friend should pay for their own replies, let them paste their key there, or give them their own deployment with its own database.

Notes:
- Vercel limits request bodies to 4.5 MB. The editor re-encodes sprite sheets larger than about 3.8 MB as WebP before upload.
- The chat route allows up to 60 seconds per reply (`maxDuration`).
- Speed: every database query is a network round trip, so pick a Vercel function region next to the Supabase region (Project Settings → Functions). Characters, settings, persona, backgrounds and lorebook are cached and refreshed when you edit them; edits made directly in the Supabase dashboard show up within 10 minutes.
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

- The parser is strict about spelling: misspelled tags such as `(narartion)`, `[Narrator]` or `(dialogue)`, misspelled names (`Obreon`), expressions (`smrik`) and commands (`{secne:…}`) are matched to the real ones. Out-of-character notes, copied scene-box lines and stray tags are dropped, so no raw format reaches the text box.
- Weaker models drift from this format. The parser repairs the common cases: `Name|expression:` without brackets, `{narration}`, `*actions*` mixed into dialogue, novel-style prose with quotes, and lines written for your persona. The model is sent its earlier replies in the cleaned-up format, so it keeps to the format better.
- An unknown expression is matched to a close one (`smiling` → `smile`, `happy` → `eyes_closed_happy`), otherwise `neutral` (dev mode shows each repair).
- An unknown character or background command is ignored. The text is kept.
- A line with no tag is dialogue from the last speaker.
- Leaving the scene: the model is told to write `{exit:Name}`, and narration such as "BB waves and heads out." removes the sprite too. A time skip (`{effect:fade}`) or a new place (`{scene:…}` with another background) clears the stage; whoever speaks next walks back in.
- Tags in the wrong brackets, such as `(Oberon|serious)` or `{BB|smirk}`, are read as dialogue tags.
- Characters never speak as you. Lines tagged with your name, part of it, a nickname from your persona, or "You" are dropped. So are quotes the prose gives to you (`"Fine," Shiru says`) and narration that speaks or decides for you (`Shiru agrees to go`).
- **Dialogue mode** shows only dialogue from the main character.

## Other features

- **Ascensions:** each ascension is a sprite sheet with its own definition (description, personality, speech style, scenario, greeting, example dialogue, opening scene). Empty fields use the character's profile. Pick the ascension when you start a story. Switching it in the story's Menu before you reply swaps the first message to that ascension's greeting; later on, a line ("BB changes form: Swimsuit.") is added to the story and the next reply is told to react to it. The prompt always names the current form and the other forms.
- **New story:** the story's Menu can start over with the same character, form, cast and mode. The old story stays on the home page.
- **Expressions:** new characters start with a standard list of about 40 expressions. The AI is only offered the ones the current ascension has a face for.
- **Scene box:** location, time, weather, who is present, mood and situation, shown on stage and sent with every reply. It updates after each reply (Settings → AI model → Scene box) and can be edited. Time of day tints the stage; rain, snow, petals, fog and storms are drawn outdoors. A place card appears when the location changes.
- **Playing as yourself:** one reply box. Plain text is what you say; `*text in asterisks*` (or Ctrl+I on a selection) is what you do; a line that starts with your own name ("Shiru sits down") also counts as an action. Your lines appear on stage with your name plate. **Choices** suggests three next moves, VN style.
- **Bond:** each character's bond (Lv 1–10) grows when they answer you. It is sent with the prompt, so they open up as it rises.
- **Stage:** click, tap, Space or Enter to advance. Auto (A), Skip (S), Hide the interface (H), Log (L), Menu (M), Controls (?). Characters breathe and move when they speak, by feeling and by each character's **Motion** style (Expressive, Bouncy, Calm or Still, set in the profile and per ascension); the AI can use `{effect:shake}`, `{effect:flash}` and `{effect:fade}`. Returning to a story shows a "Previously" card. The Log shows the whole story; you can edit, delete or pin any message there.
- **Search:** Ctrl+K (⌘K) jumps to any page, story or character, or starts a new story.
- **Regenerate:** keeps every version. Use ‹ › to switch between them.
- **Saves:** 10 slots per story. Loading replaces the story after that point.
- **Persona:** your name, how characters address you, and a short description. Inserted as `{{user}}`.
- **Lorebook:** an entry is added to the prompt when a keyword appears in recent messages. The matching code is in `src/lib/lorebook/` behind a `LoreProvider` interface, so an external lorebook can be plugged in later.
- **Memory:** when the history gets longer than the budget in Settings, older messages are summarized in the background after a reply, and the summary is sent instead. In a story's Menu you can edit the summary and write **Story memory**: your own notes, always sent. **Pin** a message in the Log to keep it word for word after it is summarized.
- **AI model settings:** presets for small, standard and large models; context size (the prompt is trimmed to fit); prompt style (Balanced, Strict format, Compact); example dialogue only until the story has its own replies; a format reminder before each reply; stop sequences at your persona's name; top P and penalties; extra instructions. Lorebook entries and the reminder go right before the latest message, so the rest of the prompt stays identical between turns and providers with prompt caching (DeepSeek, OpenAI) can reuse it.
- **Narration style** (Settings → Reading): narration and actions, yours and the characters', shown in italics (default) or plain as in FGO.
- **Appearance:** four color themes plus a custom background color. Fonts: **FGO** (the default, modelled on the game: FGO uses Fontworks' Skip for text, Matisse for names and Tsukushi Mincho for titles, which are commercial, so it uses the free M PLUS 1, Shippori Mincho B1 and Zen Old Mincho), Clear (Atkinson Hyperlegible Next), Plain (Inter), Rounded (Nunito) and Dyslexic (OpenDyslexic).
- **Connection:** presets for DeepSeek, OpenRouter, Google Gemini, OpenAI, Anthropic, Groq, Mistral, xAI and local servers, or any OpenAI-compatible address. Load the provider's model list, test with one tiny request, save. A saved key is only ever sent to the address it was saved for.

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
