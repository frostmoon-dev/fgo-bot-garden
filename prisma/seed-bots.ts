// Writes the built-in bots in prisma/bots to the database: npx tsx prisma/seed-bots.ts [name ...]
// A bot that already exists (matched by name) is updated in place, so its stories, bond and memories stay.
// Its expressions are added or updated but never removed (old messages may still use them).
import "dotenv/config";
import type { PrismaClient } from "../src/generated/prisma/client";
import { BOTS } from "./bots";
import { SHEET, type Bot, type Profile } from "./bots/types";
import { client } from "./seedClient";

const PROFILE_KEYS: (keyof Profile)[] = [
  "description",
  "personality",
  "speechStyle",
  "lore",
  "relationship",
  "scenario",
  "greeting",
  "exampleDialogues",
  "openingScene",
];


// Every profile field, "" when not given, so a field removed from a file is also cleared in the database.
const overrides = (o: Partial<Profile> = {}) => Object.fromEntries(PROFILE_KEYS.map((k) => [k, o[k] ?? ""])) as unknown as Profile;

function check(bot: Bot) {
  const keys = new Set(bot.expressions.map((e) => e.key));
  if (!keys.has("neutral")) throw new Error(`${bot.name}: needs a neutral expression`);
  for (const set of bot.spriteSets) {
    for (const [key, cell] of Object.entries(set.faces)) {
      if (!keys.has(key)) throw new Error(`${bot.name} / ${set.name}: face for unknown expression "${key}"`);
      if (cell >= set.faceCount) throw new Error(`${bot.name} / ${set.name}: "${key}" uses cell ${cell}, sheet has ${set.faceCount}`);
    }
  }
  // Greetings and examples may only use expressions the character has.
  const texts = [bot.profile.greeting, bot.profile.exampleDialogues, ...bot.spriteSets.flatMap((s) => [s.overrides?.greeting ?? "", s.overrides?.exampleDialogues ?? ""])];
  for (const m of texts.join("\n").matchAll(/\[([^\]|]+)\|([^\]]+)\]/g)) {
    if (m[1].trim() === bot.name && !keys.has(m[2].trim())) throw new Error(`${bot.name}: sample line uses unknown expression "${m[2]}"`);
  }
}

async function seed(db: PrismaClient, bot: Bot) {
  check(bot);
  const background = bot.defaultBackgroundKey ? await db.background.findUnique({ where: { key: bot.defaultBackgroundKey } }) : null;
  const data = { name: bot.name, aliases: bot.aliases, color: bot.color, motion: bot.motion, ...bot.profile, defaultBackgroundId: background?.id ?? null };

  await db.$transaction(async (tx) => {
    const found = await tx.character.findFirst({ where: { name: bot.name } });
    const character = found ? await tx.character.update({ where: { id: found.id }, data }) : await tx.character.create({ data });

    const byKey = new Map<string, string>();
    for (const [i, e] of bot.expressions.entries()) {
      const row = await tx.expression.upsert({
        where: { characterId_key: { characterId: character.id, key: e.key } },
        update: { label: e.label, description: e.description, sortOrder: i },
        create: { characterId: character.id, key: e.key, label: e.label, description: e.description, sortOrder: i },
      });
      byKey.set(e.key, row.id);
    }

    let defaultSetId: string | null = null;
    for (const [i, s] of bot.spriteSets.entries()) {
      const grid = {
        sheetUrl: s.sheetUrl,
        sheetWidth: s.sheetWidth,
        sheetHeight: s.sheetHeight,
        ...SHEET,
        faceCount: s.faceCount,
        faceX: s.faceX,
        faceY: s.faceY,
        sortOrder: i,
        motion: s.motion ?? "",
        ...overrides(s.overrides),
      };
      const existing = await tx.spriteSet.findFirst({ where: { characterId: character.id, name: s.name } });
      const set = existing
        ? await tx.spriteSet.update({ where: { id: existing.id }, data: grid })
        : await tx.spriteSet.create({ data: { characterId: character.id, name: s.name, ...grid } });
      await tx.spriteFace.deleteMany({ where: { spriteSetId: set.id } });
      await tx.spriteFace.createMany({
        data: Object.entries(s.faces).map(([key, cellIndex]) => ({ spriteSetId: set.id, expressionId: byKey.get(key)!, cellIndex })),
      });
      if (s.name === bot.defaultSpriteSet) defaultSetId = set.id;
    }
    await tx.character.update({ where: { id: character.id }, data: { defaultSpriteSetId: defaultSetId } });
    console.log(`${found ? "Updated" : "Created"} ${bot.name}: ${bot.expressions.length} expressions, ${bot.spriteSets.length} ascension(s)`);
  }, { timeout: 60_000 });
}

async function main() {
  const only = process.argv.slice(2).map((n) => n.toLowerCase());
  const bots = only.length ? BOTS.filter((b) => only.includes(b.name.toLowerCase())) : BOTS;
  for (const bot of bots) check(bot);
  const db = client();
  try {
    for (const bot of bots) await seed(db, bot);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
