-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "motion" TEXT NOT NULL DEFAULT 'expressive';

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "font" SET DEFAULT 'fgo';

-- AlterTable
ALTER TABLE "SpriteSet" ADD COLUMN     "motion" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Connection" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

