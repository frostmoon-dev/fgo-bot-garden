-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "bond" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingScene" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "scene" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "autoChoices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sceneTracker" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SpriteSet" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exampleDialogues" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "greeting" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lore" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "openingScene" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "personality" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "relationship" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "scenario" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "speechStyle" TEXT NOT NULL DEFAULT '';

