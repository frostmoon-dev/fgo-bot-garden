import { describe, expect, it } from "vitest";
import { characterExportSchema } from "../characterExport";
import { cardTextFromPng, cardToExport, convertExamples, isCard, readCharacterFile } from "../tavernCard";

// A minimal PNG: signature, then chunks (CRC left as zeros; the reader doesn't check it).
function png(chunks: [string, Uint8Array][]): Uint8Array {
  const parts: number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  for (const [type, data] of [...chunks, ["IEND", new Uint8Array()] as [string, Uint8Array]]) {
    const len = data.length;
    parts.push((len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);
    for (const c of type) parts.push(c.charCodeAt(0));
    parts.push(...data, 0, 0, 0, 0);
  }
  return Uint8Array.from(parts);
}
const tEXt = (keyword: string, text: string) => new TextEncoder().encode(`${keyword}\0${text}`);
const b64 = (json: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(json))));
const file = (bytes: Uint8Array, name = "card.png") => ({ name, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });

const v2 = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "Ishtar",
    nickname: "Rin",
    description: "Goddess of Venus. Calls <USER> a servant.",
    personality: "Proud, greedy, secretly kind.",
    scenario: "Chaldea, late evening.",
    first_mes: '*Ishtar floats in.* "Well? Aren\'t you going to greet a goddess?"',
    mes_example: "<START>\n{{user}}: Hi.\n{{char}}: Hmph. Took you long enough.\nIshtar: *flips her hair*",
    character_book: {
      entries: [
        { keys: ["Venus", "Maanna"], content: "Maanna is Ishtar's boat of heaven.", comment: "Maanna", enabled: true },
        { keys: ["off"], content: "disabled entry", enabled: false },
      ],
    },
  },
};

describe("character cards", () => {
  it("converts a v2 card into this app's import format", () => {
    const out = characterExportSchema.parse(cardToExport(v2));
    expect(out.character).toMatchObject({
      name: "Ishtar",
      aliases: ["Rin"],
      description: "Goddess of Venus. Calls {{user}} a servant.",
      personality: "Proud, greedy, secretly kind.",
      scenario: "Chaldea, late evening.",
      greeting: v2.data.first_mes,
    });
    expect(out.character.exampleDialogues).toBe("{{user}}: Hi.\n[Ishtar|neutral] Hmph. Took you long enough.\n[Ishtar|neutral] *flips her hair*");
    expect(out.lorebook).toEqual([{ title: "Maanna", keywords: ["Venus", "Maanna"], content: "Maanna is Ishtar's boat of heaven." }]);
    expect(out.spriteSets).toEqual([]);
  });

  it("reads v1 and old TavernAI cards", () => {
    expect(cardToExport({ name: "BB", description: "d", first_mes: "Hi" }).character).toMatchObject({ name: "BB", greeting: "Hi" });
    expect(cardToExport({ char_name: "BB", char_persona: "p", char_greeting: "Hello", example_dialogue: "BB: yo" }).character).toMatchObject({
      name: "BB",
      personality: "p",
      greeting: "Hello",
      exampleDialogues: "[BB|neutral] yo",
    });
  });

  it("tells cards apart from this app's own export", () => {
    expect(isCard(v2)).toBe(true);
    expect(isCard({ format: "fgo-bot-garden/character", version: 1, character: { name: "BB" } })).toBe(false);
    expect(() => cardToExport({ spec: "chara_card_v2", data: {} })).toThrow(/no name/);
  });

  it("finds the card in a PNG, preferring version 3", () => {
    const bytes = png([
      ["tEXt", tEXt("chara", b64({ ...v2, data: { ...v2.data, name: "Old" } }))],
      ["tEXt", tEXt("ccv3", b64({ ...v2, spec: "chara_card_v3" }))],
    ]);
    expect(cardTextFromPng(bytes)).toBe(b64({ ...v2, spec: "chara_card_v3" }));
    expect(cardTextFromPng(new TextEncoder().encode("{}"))).toBeNull();
  });

  it("reads PNG cards, card JSON and this app's JSON from a file", async () => {
    const fromPng = (await readCharacterFile(file(png([["tEXt", tEXt("chara", b64(v2))]])))) as { character: { name: string } };
    expect(fromPng.character.name).toBe("Ishtar");
    const fromJson = (await readCharacterFile(file(new TextEncoder().encode(JSON.stringify(v2)), "c.json"))) as { character: { name: string } };
    expect(fromJson.character.name).toBe("Ishtar");
    const own = { format: "fgo-bot-garden/character", version: 1, character: { name: "BB" } };
    expect(await readCharacterFile(file(new TextEncoder().encode(JSON.stringify(own)), "bb.json"))).toEqual(own);
    await expect(readCharacterFile(file(png([])))).rejects.toThrow(/no character card/);
  });

  it("keeps example lines that aren't the character's", () => {
    expect(convertExamples("<START>\n{{user}}: hey\n\n\n<START>\n{{char}}: hi", "BB")).toBe("{{user}}: hey\n\n[BB|neutral] hi");
  });
});
