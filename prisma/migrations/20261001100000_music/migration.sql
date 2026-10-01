-- A looping music track for a background, and how loud music plays (0 turns it off).
ALTER TABLE "Background" ADD COLUMN "musicUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "musicVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
