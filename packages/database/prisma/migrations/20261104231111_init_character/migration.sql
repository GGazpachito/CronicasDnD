-- CreateTable
CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "ruleset" VARCHAR(32) NOT NULL DEFAULT 'dnd-2024',
    "characterClass" VARCHAR(32) NOT NULL DEFAULT 'fighter',
    "level" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "rulesVersion" VARCHAR(80) NOT NULL DEFAULT 'phb-2024-srd-5.2.1',
    "selection" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_updatedAt_idx" ON "Character"("updatedAt");
