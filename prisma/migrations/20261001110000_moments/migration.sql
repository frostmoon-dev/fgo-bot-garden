-- Moments kept from stories: a snapshot of the screen (background, sprite and face, the line), so a card
-- still shows after the story, character or background changes.
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "storyTitle" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "sprite" JSONB,
    "speaker" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "narration" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Moment_createdAt_idx" ON "Moment"("createdAt");
