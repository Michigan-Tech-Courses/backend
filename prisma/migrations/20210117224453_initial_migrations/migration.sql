-- CreateTable
CREATE TABLE "Instructor" (
"id" SERIAL,
    "fullName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "office" TEXT,
    "websiteURL" TEXT,
    "lastPhotoHash" TEXT,
    "interests" TEXT[],
    "occupations" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Instructor.fullName_unique" ON "Instructor"("fullName");
