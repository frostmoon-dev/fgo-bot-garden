<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UI/UX rules for this app

Follow these when adding or changing any screen.

1. **Where am I, what can I do, how do I go back.** Every page shows its title, highlights its nav item, and has a visible way back (the story screen: "← Home"; editors: "← Characters").
2. **One primary action per view.** Only the main action is a filled accent button. Everything else is secondary or quiet.
3. **Everything is reachable by keyboard.** Ctrl+K (⌘K) opens search on every main page. On the story screen each control has a key (A, S, H, L, M, ?), listed in the Controls panel. Add new shortcuts to `SHORTCUTS` in `src/components/stage/usePlaybackEffects.ts`.
4. **Plain words.** Say *story*, *ascension*, *scene*, *version* in the UI, never *session*, *sprite set*, *variant*. Say what a setting does and what it costs ("one small extra request per reply").
5. **Nothing destructive without a confirm** that names what will be lost. Prefer reversible actions (new message versions instead of overwriting).
6. **Empty states say what to do next** and link to it.
7. **Instant feedback.** Update the screen optimistically, show a loading screen or shimmer for anything slower than about 300 ms, and report background results (bond level-ups, pins) with a short toast.
8. **The story comes first.** Stage chrome stays small and translucent; H hides it. The AI's raw format ([Name|expression], (narration), {commands}) never reaches the reader: the parser in `src/lib/parser/` repairs or drops it.
9. **Works on a phone.** Touch targets at least 40 px, usable at 360 px wide, no sideways scrolling.
10. **Calm motion.** Animations are short and subtle, and turn off under `prefers-reduced-motion`.
