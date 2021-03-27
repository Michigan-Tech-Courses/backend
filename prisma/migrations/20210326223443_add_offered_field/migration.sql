/*
  Warnings:

  - You are about to alter the column `averageDifficultyRating` on the `Instructor` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `averageRating` on the `Instructor` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `minCredits` on the `Section` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `maxCredits` on the `Section` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "offered" "Semester"[];

-- AlterTable
ALTER TABLE "Instructor" ALTER COLUMN "averageDifficultyRating" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "averageRating" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "minCredits" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxCredits" SET DATA TYPE DOUBLE PRECISION;
