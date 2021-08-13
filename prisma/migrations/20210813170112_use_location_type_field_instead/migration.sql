/*
  Warnings:

  - You are about to drop the column `isOnline` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `isRemote` on the `Section` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PHYSICAL', 'ONLINE', 'REMOTE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Section" DROP COLUMN "isOnline",
DROP COLUMN "isRemote",
ADD COLUMN     "locationType" "LocationType" NOT NULL DEFAULT E'UNKNOWN';
