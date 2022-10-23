/*
  Warnings:

  - A unique constraint covering the columns `[courseId,section]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Section_courseId_section_key" ON "Section"("courseId", "section");
