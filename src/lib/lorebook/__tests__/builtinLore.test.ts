import { describe, expect, it } from "vitest";
import { CHALDEA_LORE } from "../../../../prisma/lore/chaldea";
import { matchLore } from "../matcher";

const entries = CHALDEA_LORE.map((e, i) => ({ ...e, id: String(i), enabled: true }));
const fired = (text: string) => matchLore(entries, [text]).map((e) => e.title);

describe("built-in lorebook", () => {
  it("has unique titles, keywords on every entry, and short texts (they are sent with replies)", () => {
    expect(new Set(CHALDEA_LORE.map((e) => e.title)).size).toBe(CHALDEA_LORE.length);
    for (const e of CHALDEA_LORE) {
      expect(e.keywords.length).toBeGreaterThan(0);
      expect(e.content.split(/\s+/).length).toBeLessThanOrEqual(90);
    }
  });

  it("never fires on words every reply uses", () => {
    expect(fired("The Master looks at her Servant and smiles. My lord, the emperor of Rome, a Roman soldier.")).toEqual([]);
  });

  it("fires on the names it is about", () => {
    expect(fired("Mash waves from the canteen door.")).toEqual(["Chaldea's canteen", "Mash Kyrielight"]);
    expect(fired("Back in Fairy Britain, Oberon was our guide.")).toEqual(["Fairy Britain"]);
  });
});
