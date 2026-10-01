-- Which small background requests go to the backup model: main (none), light (scene box, choices) or all
-- (also summaries and character memories).
ALTER TABLE "Settings" ADD COLUMN "helperModel" TEXT NOT NULL DEFAULT 'main';
