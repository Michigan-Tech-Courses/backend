-- AlterTable
ALTER TABLE "Course"
RENAME COLUMN "fromCredits" TO "minCredits";

ALTER TABLE "Course"
RENAME COLUMN "toCredits" TO "maxCredits";
