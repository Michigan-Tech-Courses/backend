-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "room" TEXT,
ADD COLUMN     "buildingName" TEXT;

-- CreateTable
CREATE TABLE "Building" (
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,

    PRIMARY KEY ("name")
);

-- AddForeignKey
ALTER TABLE "Section" ADD FOREIGN KEY ("buildingName") REFERENCES "Building"("name") ON DELETE SET NULL ON UPDATE CASCADE;
