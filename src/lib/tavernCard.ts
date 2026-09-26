import type { CharacterExport } from "./characterExport";

// Character cards from SillyTavern, JanitorAI exporters, Chub and similar sites: a JSON file, or a PNG with
// the card in a text chunk ("chara" for versions 1–2, "ccv3" for version 3, base64-encoded JSON). They are
// turned into this app's own import format, so the usual importer saves them. Cards have no sprite sheets:
// the imported bot starts without ascensions.

interface CardData {
  name?: string;
  nickname?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  character_book?: { entries?: { keys?: string[]; key?: string[]; content?: string; comment?: string; name?: string; enabled?: boolean }[] };
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function latin1(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return out;
}

// The card's text chunk, preferring version 3. Null when the PNG carries no card.
export function cardTextFromPng(bytes: Uint8Array): string | null {
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: Record<string, string> = {};
  let at = 8;
  while (at + 8 <= bytes.length) {
    const length = view.getUint32(at);
    const type = latin1(bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === "tEXt" || type === "iTXt") {
      const zero = data.indexOf(0);
      const keyword = latin1(data.subarray(0, zero)).toLowerCase();
      if (keyword === "chara" || keyword === "ccv3") {
        if (type === "tEXt") found[keyword] = latin1(data.subarray(zero + 1));
        // iTXt: compression flag, method, language\0, translated keyword\0, text. Compressed text isn't used by cards.
        else if (data[zero + 1] === 0) {
          const lang = data.indexOf(0, zero + 3);
          const translated = data.indexOf(0, lang + 1);
          found[keyword] = new TextDecoder().decode(data.subarray(translated + 1));
        }
      }
    }
    if (type === "IEND") break;
    at += 12 + length;
  }
  return found.ccv3 ?? found.chara ?? null;
}

function decodeBase64Json(text: string): unknown {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Older TavernAI / Pygmalion cards name the same fields differently.
interface OldCard {
  char_name?: string;
  char_persona?: string;
  world_scenario?: string;
  char_greeting?: string;
  example_dialogue?: string;
}

// The card's fields, whatever version it is: v2/v3 keep them under `data`, v1 at the top.
function cardData(json: unknown): CardData | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as { data?: CardData } & CardData & OldCard;
  const raw: CardData & OldCard = obj.data && typeof obj.data === "object" ? obj.data : obj;
  const data: CardData = {
    ...raw,
    name: raw.name ?? raw.char_name,
    personality: raw.personality ?? raw.char_persona,
    scenario: raw.scenario ?? raw.world_scenario,
    first_mes: raw.first_mes ?? raw.char_greeting,
    mes_example: raw.mes_example ?? raw.example_dialogue,
  };
  return typeof data.name === "string" && data.name.trim() ? data : null;
}

// A card, not this app's own export (which has a `format` field).
export function isCard(json: unknown): boolean {
  if (!json || typeof json !== "object" || "format" in json) return false;
  const obj = json as Record<string, unknown>;
  return !!cardData(json) && ("spec" in obj || "first_mes" in obj || "char_greeting" in obj || "char_persona" in obj);
}

// Old cards write <USER> and <BOT>; this app uses {{user}} and {{char}}.
function macros(text: string | undefined): string {
  return (text ?? "").replace(/<USER>/gi, "{{user}}").replace(/<BOT>/gi, "{{char}}").replace(/\r\n/g, "\n").trim();
}

// "{{char}}: Hello" becomes "[Name|neutral] Hello", the tag format the story uses. <START> only separated
// the examples, so it becomes a blank line.
export function convertExamples(text: string, name: string): string {
  const label = new RegExp(`^\\s*(?:\\{\\{char\\}\\}|${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*:\\s*`, "i");
  return macros(text)
    .split("\n")
    .map((line) => (/^\s*<start>\s*$/i.test(line) ? "" : line.replace(label, `[${name}|neutral] `)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cardToExport(json: unknown): CharacterExport {
  const card = cardData(json);
  if (!card) throw new Error("This file isn't a character card: it has no name.");
  const name = card.name!.trim().slice(0, 80);
  const nickname = card.nickname?.trim();
  const lorebook = (card.character_book?.entries ?? [])
    .filter((e) => e.enabled !== false && e.content?.trim())
    .map((e) => ({
      title: (e.comment || e.name || "").trim().slice(0, 120),
      keywords: (e.keys ?? e.key ?? []).map((k) => k.trim()).filter(Boolean),
      content: macros(e.content),
    }));
  return {
    format: "fgo-bot-garden/character",
    version: 1,
    character: {
      name,
      aliases: nickname && nickname !== name ? [nickname] : [],
      description: macros(card.description),
      personality: macros(card.personality),
      scenario: macros(card.scenario),
      greeting: macros(card.first_mes),
      exampleDialogues: convertExamples(card.mes_example ?? "", name),
    },
    lorebook,
  };
}

// Reads an uploaded file: this app's own JSON, or a character card (JSON or PNG), always returned in this
// app's import format.
export async function readCharacterFile(file: { name: string; arrayBuffer(): Promise<ArrayBuffer> }): Promise<unknown> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = cardTextFromPng(bytes);
  if (png !== null) {
    let json: unknown;
    try {
      json = decodeBase64Json(png);
    } catch {
      throw new Error("The card inside this PNG couldn't be read.");
    }
    return cardToExport(json);
  }
  if (PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    throw new Error("This PNG has no character card inside. Download the card as PNG or JSON from the site it came from.");
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("That file is neither JSON nor a character card PNG.");
  }
  return isCard(json) ? cardToExport(json) : json;
}
