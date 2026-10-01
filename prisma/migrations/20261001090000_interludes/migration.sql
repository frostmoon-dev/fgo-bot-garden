-- Which interlude a story is (1, 2 or 3), unlocked by bond level. Null for ordinary stories.
ALTER TABLE "Session" ADD COLUMN "interlude" INTEGER;
