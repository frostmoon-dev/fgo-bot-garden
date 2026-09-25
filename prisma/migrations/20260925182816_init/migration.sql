-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "color" TEXT NOT NULL DEFAULT '#c9a86a',
    "description" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "speechStyle" TEXT NOT NULL DEFAULT '',
    "lore" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT '',
    "scenario" TEXT NOT NULL DEFAULT '',
    "greeting" TEXT NOT NULL DEFAULT '',
    "exampleDialogues" TEXT NOT NULL DEFAULT '',
    "defaultSpriteSetId" TEXT,
    "defaultBackgroundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expression" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Expression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpriteSet" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sheetUrl" TEXT NOT NULL,
    "sheetWidth" INTEGER NOT NULL DEFAULT 1024,
    "sheetHeight" INTEGER NOT NULL DEFAULT 1792,
    "bodyHeight" INTEGER NOT NULL DEFAULT 768,
    "cellSize" INTEGER NOT NULL DEFAULT 256,
    "columns" INTEGER NOT NULL DEFAULT 4,
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "faceX" INTEGER NOT NULL DEFAULT 384,
    "faceY" INTEGER NOT NULL DEFAULT 160,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpriteSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpriteFace" (
    "id" TEXT NOT NULL,
    "spriteSetId" TEXT NOT NULL,
    "expressionId" TEXT NOT NULL,
    "cellIndex" INTEGER NOT NULL,

    CONSTRAINT "SpriteFace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Background" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Background_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Master',
    "description" TEXT NOT NULL DEFAULT '',
    "addressAs" TEXT NOT NULL DEFAULT 'Master',

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LorebookEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT[],
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LorebookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'narrative',
    "mainCharacterId" TEXT NOT NULL,
    "backgroundId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "summarizedUntil" INTEGER NOT NULL DEFAULT -1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCast" (
    "sessionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "spriteSetId" TEXT,

    CONSTRAINT "SessionCast_pkey" PRIMARY KEY ("sessionId","characterId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "activeVariant" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageVariant" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaveSlot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaveSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "maxTokens" INTEGER NOT NULL DEFAULT 900,
    "textSpeed" INTEGER NOT NULL DEFAULT 45,
    "autoSpeed" INTEGER NOT NULL DEFAULT 1600,
    "uiScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "loreScanDepth" INTEGER NOT NULL DEFAULT 4,
    "contextBudget" INTEGER NOT NULL DEFAULT 6000,
    "keepRecent" INTEGER NOT NULL DEFAULT 12,
    "devMode" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expression_characterId_key_key" ON "Expression"("characterId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SpriteFace_spriteSetId_expressionId_key" ON "SpriteFace"("spriteSetId", "expressionId");

-- CreateIndex
CREATE UNIQUE INDEX "Background_key_key" ON "Background"("key");

-- CreateIndex
CREATE INDEX "Message_sessionId_order_idx" ON "Message"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MessageVariant_messageId_position_key" ON "MessageVariant"("messageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SaveSlot_sessionId_slot_key" ON "SaveSlot"("sessionId", "slot");

-- AddForeignKey
ALTER TABLE "Expression" ADD CONSTRAINT "Expression_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteSet" ADD CONSTRAINT "SpriteSet_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteFace" ADD CONSTRAINT "SpriteFace_spriteSetId_fkey" FOREIGN KEY ("spriteSetId") REFERENCES "SpriteSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteFace" ADD CONSTRAINT "SpriteFace_expressionId_fkey" FOREIGN KEY ("expressionId") REFERENCES "Expression"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_mainCharacterId_fkey" FOREIGN KEY ("mainCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCast" ADD CONSTRAINT "SessionCast_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCast" ADD CONSTRAINT "SessionCast_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageVariant" ADD CONSTRAINT "MessageVariant_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveSlot" ADD CONSTRAINT "SaveSlot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
