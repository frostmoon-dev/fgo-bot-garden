// Writes the built-in backgrounds (prisma/backgrounds) to the database: npx tsx prisma/seed-backgrounds.ts
// A background that already exists (matched by key) gets the new label, image and description, but keeps any
// music you set for it. Backgrounds you added yourself are never touched.
import "dotenv/config";
import { existsSync } from "node:fs";
import { BACKGROUNDS } from "./backgrounds";
import { client } from "./seedClient";

function check() {
  const keys = new Set<string>();
  for (const b of BACKGROUNDS) {
    if (!/^[a-z0-9_]+$/.test(b.key)) throw new Error(`${b.key}: keys use lowercase letters, digits and _ only`);
    if (keys.has(b.key)) throw new Error(`${b.key}: used twice`);
    keys.add(b.key);
    if (!existsSync(`public${b.imageUrl}`)) throw new Error(`${b.key}: no file at public${b.imageUrl}`);
  }
}

async function main() {
  check();
  const db = client();
  try {
    const existing = new Set((await db.background.findMany({ select: { key: true } })).map((b) => b.key));
    for (const b of BACKGROUNDS) {
      await db.background.upsert({
        where: { key: b.key },
        update: { label: b.label, imageUrl: b.imageUrl, description: b.description },
        create: b,
      });
    }
    const added = BACKGROUNDS.filter((b) => !existing.has(b.key)).length;
    console.log(`Backgrounds: ${added} added, ${BACKGROUNDS.length - added} updated. Open Settings > Reload data, or wait a few minutes, to see them in the app.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
