// Writes the built-in lorebook (prisma/lore) to the database: npx tsx prisma/seed-lore.ts
// An entry that already exists (matched by title) gets the new keywords and text, but stays switched on or
// off as you left it. Entries you wrote yourself are never touched.
import "dotenv/config";
import { CHALDEA_LORE } from "./lore/chaldea";
import { client } from "./seedClient";

async function main() {
  const db = client();
  try {
    let created = 0;
    let updated = 0;
    for (const entry of CHALDEA_LORE) {
      const found = await db.lorebookEntry.findFirst({ where: { title: entry.title } });
      if (found) {
        await db.lorebookEntry.update({ where: { id: found.id }, data: { keywords: entry.keywords, content: entry.content } });
        updated++;
      } else {
        await db.lorebookEntry.create({ data: entry });
        created++;
      }
    }
    console.log(`Lorebook: ${created} added, ${updated} updated. Open Settings > Reload data, or wait a few minutes, to see them in the app.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
