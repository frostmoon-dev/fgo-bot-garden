import { describe, expect, it } from "vitest";
import { narrationSubject } from "../subject";

const cast = [
  { id: "bb", name: "BB", aliases: ["BB-chan"] },
  { id: "ob", name: "Oberon", aliases: ["Vortigern"] },
];

describe("narrationSubject", () => {
  it("picks the character the narration names first", () => {
    expect(narrationSubject("BB giggles, leaning in with a knowing look.", cast)).toBe("bb");
    expect(narrationSubject("Oberon sighs while BB laughs.", cast)).toBe("ob");
    expect(narrationSubject("Vortigern's wings fold.", cast)).toBe("ob");
  });

  it("names nobody when no one on stage is mentioned, or only inside another word", () => {
    expect(narrationSubject("The lights hum quietly.", cast)).toBeNull();
    expect(narrationSubject("A BBQ smell drifts in.", cast)).toBeNull();
  });
});
