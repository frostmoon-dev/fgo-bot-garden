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
9. **Works on a phone.** Touch targets at least 40 px, usable at 360 px wide, no sideways scrolling. Main pages are navigated from the bottom tab bar on phones (`TabBar` in `src/components/ui/Nav.tsx`): anything sticky at the bottom sits above it (`bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0`). Pad for `env(safe-area-inset-*)`, since the home-screen app draws under the status bar. Text boxes are at least 16px on touch screens, or iPhones zoom in.
10. **Calm motion.** Animations are short and subtle, and turn off under `prefers-reduced-motion`.
11. **Colors that rest the eyes.** No pure black or pure white (dark greys around #121212–#1e1e1e, off-white text): full contrast causes halation and afterimages, worst with astigmatism. Body text at least 7:1, muted text at least 4.5:1. Design in greys first, then one accent (the theme's `--accent`) used sparingly. New colors are mixed from the four theme variables in `src/lib/appearance.ts`. FGO navy surfaces use only the palette at the top of `src/app/globals.css` (`--navy-950…500`, `--sky-*`, `--edge`, `--on-navy*`): never type a hex or rgb value into a rule or class; add a token if one is missing.
12. **Readable type.** One family, as in FGO's own UI: Figtree for everything, text, titles and names. Hierarchy comes from weight and size, not a second face: `page-title` (700, slightly tight), names in `font-name` (600, never italic), section headings in `tab-heading` (FGO's blue name tab). No decorative serifs, no wide-tracked small caps. Buttons use the `btn` classes: `btn-primary` (gold, one per view), `btn-outline`, `btn-quiet`, `btn-danger`. Text at line-height 1.5 or more and 45–80 characters per line. Keep Clear (Atkinson Hyperlegible) and Dyslexic available; they replace Figtree everywhere. With FGO frames the story screen's top bar shows only Auto, Skip ▶ and Menu (the rest live in the Menu and on keys).
13. **Not vibe-coded.** No blue-to-purple gradients, no glow, no textures or ornaments on every surface, no decorative icons standing in for words. One spacing scale (Tailwind's), used consistently. FGO textures come from `public/assets/ui/fgo`: the chat window's diamond surface (`surface.png`) on the nav bar and cards, the name tab on section headings. Crop textures to fit, never stretch them out of shape. Design for a 390px phone first: 16px gutters. Check changes in a screenshot before calling them done.
