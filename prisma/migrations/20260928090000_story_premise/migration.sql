-- The scene the user wrote for a story (Write a scene). It replaces the main character's scenario.
ALTER TABLE "Session" ADD COLUMN "premise" TEXT NOT NULL DEFAULT '';
