-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRemote" BOOLEAN NOT NULL DEFAULT false;
