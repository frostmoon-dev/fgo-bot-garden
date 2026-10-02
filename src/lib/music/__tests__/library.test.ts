import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ScriptParser } from "@/lib/parser";
import { makeCtx } from "@/lib/parser/__tests__/fixtures";
import { buildBeats, initialStage } from "@/lib/stage";
import { MUSIC_MOODS, TRACKS, moodOfScene, musicFor, pickTrack } from "../library";

describe("music library", () => {
  it("has a file in public/music for every track", () => {
    const missing = TRACKS.filter((t) => !fs.existsSync(path.join(process.cwd(), "public/music", t.file))).map((t) => t.file);
    expect(missing).toEqual([]);
  });

  it("has tracks for every mood", () => {
    for (const mood of MUSIC_MOODS) expect(TRACKS.some((t) => t.moods.includes(mood)), mood).toBe(true);
  });
});

describe("moodOfScene", () => {
  it("reads the Mood line", () => {
    expect(moodOfScene({ Mood: "tense, guarded" })).toBe("tense");
    expect(moodOfScene({ Mood: "warm, a little flustered" })).toBe("tender");
    expect(moodOfScene({ Mood: "playful teasing" })).toBe("playful");
  });

  it("lets the stronger mood win a tie", () => {
    expect(moodOfScene({ Mood: "sad but tender" })).toBe("sad");
  });

  it("colours a calm scene by place and hour", () => {
    expect(moodOfScene({ Mood: "relaxed", Location: "a beach resort" })).toBe("sea");
    expect(moodOfScene({ Mood: "quiet", Time: "midnight" })).toBe("night");
    expect(moodOfScene({ Mood: "quiet", Time: "noon" })).toBe("calm");
  });

  it("finds nothing in an empty scene box", () => {
    expect(moodOfScene({})).toBeNull();
  });
});

describe("musicFor", () => {
  const scene = { Mood: "calm" };
  it("keeps a background's own track in calm moments, and overrides it for strong moods", () => {
    expect(musicFor({ storyId: "s", cue: undefined, scene, backgroundMusic: "/uploads/theme.mp3" })).toBe("/uploads/theme.mp3");
    expect(musicFor({ storyId: "s", cue: "battle", scene, backgroundMusic: "/uploads/theme.mp3" })).toMatch(/^\/music\//);
  });

  it("plays nothing on a silence cue", () => {
    expect(musicFor({ storyId: "s", cue: "silence", scene, backgroundMusic: "/x.mp3" })).toBeNull();
  });

  it("keeps the same track for a mood within a story", () => {
    expect(pickTrack("story-1", "sad")).toEqual(pickTrack("story-1", "sad"));
  });
});

describe("{music:…}", () => {
  const parse = (line: string) => new ScriptParser(makeCtx().ctx).parseLine(line);

  it("reads moods, other words for them, and silence", () => {
    expect(parse("{music:tense}")).toEqual([{ type: "music", cue: "tense" }]);
    expect(parse("{music:romantic}")).toEqual([{ type: "music", cue: "tender" }]);
    expect(parse("{music:stop}")).toEqual([{ type: "music", cue: "silence" }]);
    expect(parse("{music:kazoo}")).toEqual([]);
  });

  it("lasts for the reply that gave it", () => {
    const { ctx } = makeCtx();
    const { beats } = buildBeats(
      [
        { id: "a", role: "assistant", content: "[BB|neutral] Hi.\n{music:battle}\n[BB|angry] Fight!" },
        { id: "u", role: "user", content: "Okay." },
        { id: "b", role: "assistant", content: "[BB|neutral] Done." },
      ],
      ctx,
      { mode: "narrative", mainCharacterId: "bb" },
      initialStage(null, "bb"),
      { user: "Ritsuka", char: "BB" },
      "Ritsuka",
    );
    expect(beats.map((b) => b.stage.music)).toEqual([undefined, "battle", "battle", undefined]);
  });
});
