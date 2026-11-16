-- DropForeignKey
ALTER TABLE "Locker" DROP CONSTRAINT "Locker_userId_fkey";

-- DropForeignKey
ALTER TABLE "LockerTarget" DROP CONSTRAINT "LockerTarget_lockerId_fkey";

-- DropTable
DROP TABLE "Locker";

-- DropTable
DROP TABLE "LockerTarget";

-- DropTable
DROP TABLE "UnlockSession";

