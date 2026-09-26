import { describe, expect, it } from "vitest";
import { availableExpressions, pickAscension, resolveProfile, type AscensionProfile } from "../ascension";
import { bondLevel, bondProgress, bondSpeakers } from "../bond";
import { cleanScene, normalizeScene, parseScene, timeOfDay, weatherOf } from "../scene";
import { parseChoices } from "../story/choices";
import { asAction, splitUserText, userTextForPrompt } from "../userInput";

const empty: AscensionProfile = {
  description: "",
  personality: "",
  speechStyle: "",
  lore: "",
  relationship: "",
  scenario: "",
  greeting: "",
  exampleDialogues: "",
  openingScene: "",
};

describe("ascensions", () => {
  it("uses the ascension's own fields and falls back to the profile", () => {
    const base = { ...empty, description: "Fairy King", personality: "cheerful", greeting: "Hello" };
    const vortigern = { ...empty, personality: "bitter", greeting: "...Ah. You." };
    expect(resolveProfile(base, vortigern)).toMatchObject({ description: "Fairy King", personality: "bitter", greeting: "...Ah. You." });
    expect(resolveProfile(base, { ...empty, personality: "   " }).personality).toBe("cheerful");
  });

  it("picks the chosen, then the default, then the first ascension", () => {
    const c = { defaultSpriteSetId: "b", spriteSets: [{ id: "a" }, { id: "b" }] };
    expect(pickAscension(c, "a")?.id).toBe("a");
    expect(pickAscension(c, null)?.id).toBe("b");
    expect(pickAscension({ defaultSpriteSetId: null, spriteSets: [{ id: "a" }] })?.id).toBe("a");
  });

  it("offers only expressions that have a face", () => {
    const list = [{ key: "neutral" }, { key: "smile" }, { key: "crying" }];
    expect(availableExpressions(list, { smile: 2 }).map((e) => e.key)).toEqual(["neutral", "smile"]);
    expect(availableExpressions(list, null)).toHaveLength(3);
  });
});

describe("scene box", () => {
  it("reads and cleans Key: value lines", () => {
    const text = "Location: Observation deck\n- time: Night\nMood: quiet\nRandom text\nFoo: bar";
    expect(parseScene(text)).toEqual({ Location: "Observation deck", Time: "Night", Mood: "quiet" });
    expect(cleanScene(text)).toBe("Location: Observation deck\nTime: Night\nMood: quiet");
    expect(normalizeScene("They are on a rooftop.")).toBe("Situation: They are on a rooftop.");
    expect(parseScene("*Location: BB's room*\n**Present:** Shiru, BB*\n`Mood`: Playful*")).toEqual({
      Location: "BB's room",
      Present: "Shiru, BB",
      Mood: "Playful",
    });
  });

  it("reads time of day and outdoor weather", () => {
    expect(timeOfDay("Late night")).toBe("night");
    expect(timeOfDay("Sunset")).toBe("dusk");
    expect(timeOfDay("Late morning")).toBe("day");
    expect(weatherOf("Heavy snow")).toBe("snow");
    expect(weatherOf("indoors (snowing outside)")).toBeNull();
    expect(weatherOf("Thunderstorm")).toBe("storm");
  });
});

describe("choices", () => {
  it("reads SAY and DO lines, tolerating numbering and quotes", () => {
    expect(parseChoices('1. SAY: "Why are you awake?"\n- DO: Sit next to him.\nnoise\n**Say**: Goodnight.')).toEqual([
      { kind: "say", text: "Why are you awake?" },
      { kind: "do", text: "Sit next to him." },
      { kind: "say", text: "Goodnight." },
    ]);
    // The screenshot bug: an action choice with one stray asterisk.
    expect(parseChoices("DO: Shiru grabs BB's arm, holding on tightly.*")).toEqual([
      { kind: "do", text: "Shiru grabs BB's arm, holding on tightly." },
    ]);
    expect(parseChoices("SAY: *smiles* Thanks")).toEqual([{ kind: "say", text: "*smiles* Thanks" }]);
  });
});

describe("user input", () => {
  it("splits speech and *actions*", () => {
    expect(splitUserText('*waves* "Hello!" (smiles)')).toEqual([
      { kind: "do", text: "waves" },
      { kind: "say", text: "Hello!" },
      { kind: "do", text: "smiles" },
    ]);
    expect(asAction("sits down")).toBe("*sits down*");
    // Opening with your own name reads as an action, no asterisks needed.
    expect(splitUserText("Shiru sits down beside her.", "Shiru")).toEqual([{ kind: "do", text: "Shiru sits down beside her." }]);
    expect(splitUserText("Shiru! Over here!", "Shiru")).toEqual([{ kind: "say", text: "Shiru! Over here!" }]);
    // A missing asterisk: the action still reads as one, and no "*" reaches the screen.
    expect(splitUserText("Shiru grabs BB's arm, burying his face in her shoulder.*")).toEqual([
      { kind: "do", text: "Shiru grabs BB's arm, burying his face in her shoulder." },
    ]);
    expect(splitUserText("Hi *waves")).toEqual([
      { kind: "say", text: "Hi" },
      { kind: "do", text: "waves" },
    ]);
    expect(userTextForPrompt("hugs her*")).toBe("(hugs her)");
    expect(userTextForPrompt("*waves* Hi")).toBe("(waves) Hi");
  });
});

describe("bond", () => {
  it("levels up at the thresholds", () => {
    expect(bondLevel(0)).toBe(1);
    expect(bondLevel(4)).toBe(1);
    expect(bondLevel(5)).toBe(2);
    expect(bondLevel(10000)).toBe(10);
    expect(bondProgress(10)).toBeCloseTo(0.5);
  });

  it("counts each character who spoke once", () => {
    expect(
      bondSpeakers([
        { type: "dialogue", characterId: "bb", name: "BB", expression: "", text: "Hi" },
        { type: "dialogue", characterId: "bb", name: "BB", expression: "", text: "Again" },
        { type: "dialogue", characterId: null, name: "Guard", expression: "", text: "Halt" },
        { type: "narration", text: "Rain." },
      ]),
    ).toEqual(["bb"]);
  });
});
