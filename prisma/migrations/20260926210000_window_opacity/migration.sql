-- How much of the scene shows through the story screen's message window.
ALTER TABLE "Settings" ADD COLUMN "windowOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.8;
