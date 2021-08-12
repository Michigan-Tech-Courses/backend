/*
  Warnings:

  - Added the required column `shortName` to the `Building` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Building" ADD COLUMN     "shortName" TEXT NOT NULL;
