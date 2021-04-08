/*
  Warnings:

  - The primary key for the `TransferCourse` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "TransferCourse" DROP CONSTRAINT "TransferCourse_pkey",
ADD PRIMARY KEY ("fromCollege", "fromCRSE", "fromSubject", "toCRSE", "toSubject", "toCredits");
