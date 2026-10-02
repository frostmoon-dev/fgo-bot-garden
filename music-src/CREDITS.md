# Music

Background music in `public/music`, sorted by mood in `src/lib/music/library.ts`.

| Artist / site | Tracks |
|---|---|
| Amor Kana | 28 |
| CAMeLIA | 12 |
| Cnoc | 48 |
| Hagall | 5 |
| Maou Damashii | 13 |
| MusMus | 2 |
| Music Egg | 18 |
| On-Jin | 2 |
| Senses Circuit | 6 |
| Sea sound (SESea) | 1 |

Each site has its own terms (credit lines, non-commercial use, redistribution). Check them before
sharing the app publicly, and add any credit line a site asks for here.

## How the files were made

- `midi/` holds the original MIDI files. They were rendered with FluidSynth and the FluidR3 GM
  soundfont, because browsers can't play MIDI, then encoded as AAC at 64 kbps.
- The MP3 and WAV originals were re-encoded as AAC at 128 kbps.
- Every track was set to the same loudness (-18 LUFS), so a mood change never jumps in volume.
- The originals are in the git history (commit d854e85) if a track ever needs redoing.
