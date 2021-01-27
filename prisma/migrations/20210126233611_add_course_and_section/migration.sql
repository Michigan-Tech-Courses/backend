-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('FALL', 'SPRING', 'SUMMER');

-- CreateTable
CREATE TABLE "Course" (
    "year" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "subject" TEXT NOT NULL,
    "crse" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    PRIMARY KEY ("year","semester","subject","crse")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "crn" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "cmp" TEXT NOT NULL,
    "minCredits" DECIMAL(65,30) NOT NULL,
    "maxCredits" DECIMAL(65,30) NOT NULL,
    "time" JSONB NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "takenSeats" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "courseYear" INTEGER NOT NULL,
    "courseSemester" "Semester" NOT NULL,
    "courseSubject" TEXT NOT NULL,
    "courseCrse" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstructorToSection" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Course.updatedAt_index" ON "Course"("updatedAt");

-- CreateIndex
CREATE INDEX "Course.deletedAt_index" ON "Course"("deletedAt");

-- CreateIndex
CREATE INDEX "Section.updatedAt_index" ON "Section"("updatedAt");

-- CreateIndex
CREATE INDEX "Section.deletedAt_index" ON "Section"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_InstructorToSection_AB_unique" ON "_InstructorToSection"("A", "B");

-- CreateIndex
CREATE INDEX "_InstructorToSection_B_index" ON "_InstructorToSection"("B");

-- CreateIndex
CREATE INDEX "Instructor.updatedAt_index" ON "Instructor"("updatedAt");

-- CreateIndex
CREATE INDEX "Instructor.deletedAt_index" ON "Instructor"("deletedAt");

-- AddForeignKey
ALTER TABLE "Section" ADD FOREIGN KEY("courseYear", "courseSemester", "courseSubject", "courseCrse")REFERENCES "Course"("year","semester","subject","crse") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorToSection" ADD FOREIGN KEY("A")REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorToSection" ADD FOREIGN KEY("B")REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
