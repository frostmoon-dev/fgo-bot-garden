-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "narrationStyle" SET DEFAULT 'italic';


-- The asterisk style was replaced by plain italics.
UPDATE "Settings" SET "narrationStyle" = 'italic' WHERE "narrationStyle" = 'asterisks';
