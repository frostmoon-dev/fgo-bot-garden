-- Characters remember the user across stories.
ALTER TABLE "Character" ADD COLUMN "memories" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Session" ADD COLUMN "rememberedUntil" INTEGER NOT NULL DEFAULT -1;
ALTER TABLE "Settings" ADD COLUMN "characterMemory" BOOLEAN NOT NULL DEFAULT true;
