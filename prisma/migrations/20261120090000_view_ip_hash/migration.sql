-- AlterTable
ALTER TABLE "ViewEvent" ADD COLUMN "ipHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "ViewEvent_resourceId_ipHash_createdAt_idx" ON "ViewEvent"("resourceId", "ipHash", "createdAt");
