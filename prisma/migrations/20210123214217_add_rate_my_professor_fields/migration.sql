-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "averageDifficultyRating" DECIMAL(65,30),
ADD COLUMN     "averageRating" DECIMAL(65,30),
ADD COLUMN     "numRatings" INTEGER,
ADD COLUMN     "rmpId" TEXT;
