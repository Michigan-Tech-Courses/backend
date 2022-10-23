-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "TransferCourse" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
