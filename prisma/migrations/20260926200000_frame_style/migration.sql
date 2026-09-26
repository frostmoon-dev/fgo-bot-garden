-- The setting now covers frames across the app, not only the story screen.
ALTER TABLE "Settings" RENAME COLUMN "stageStyle" TO "frameStyle";
