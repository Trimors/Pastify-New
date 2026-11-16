-- CreateTable
CREATE TABLE "LockerTarget" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lockerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockerTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LockerTarget_code_key" ON "LockerTarget"("code");

-- CreateIndex
CREATE INDEX "LockerTarget_lockerId_idx" ON "LockerTarget"("lockerId");

-- AddForeignKey
ALTER TABLE "LockerTarget" ADD CONSTRAINT "LockerTarget_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
