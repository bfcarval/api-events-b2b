-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('RECEBIDO', 'PROCESSANDO', 'SUCESSO', 'FALHA', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "origin" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'RECEBIDO',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_origin_idx" ON "Event"("origin");
