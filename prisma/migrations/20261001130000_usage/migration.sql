-- Token counts of every AI request, for the Usage page. Kept for 90 days.
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "cachedTokens" INTEGER,
    "completionTokens" INTEGER,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Usage_createdAt_idx" ON "Usage"("createdAt");
