-- CreateTable
CREATE TABLE "Instructor" (
"id" SERIAL,
    "fullName" TEXT NOT NULL,
    "departments" TEXT[],
    "email" TEXT,
    "phone" TEXT,
    "office" TEXT,
    "websiteURL" TEXT,
    "photoURL" TEXT,
    "interests" TEXT[],
    "occupations" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Instructor.fullName_unique" ON "Instructor"("fullName");
