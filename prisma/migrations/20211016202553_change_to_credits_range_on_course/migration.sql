/*
  Warnings:

  - You are about to drop the column `credits` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "credits",
ADD COLUMN     "fromCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "toCredits" DOUBLE PRECISION NOT NULL DEFAULT 0;
