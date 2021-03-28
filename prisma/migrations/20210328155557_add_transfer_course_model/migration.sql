-- CreateTable
CREATE TABLE "TransferCourse" (
    "id" TEXT NOT NULL,
    "fromCollege" TEXT NOT NULL,
    "fromCollegeState" TEXT NOT NULL,
    "fromCRSE" TEXT NOT NULL,
    "fromSubject" TEXT NOT NULL,
    "fromCredits" DOUBLE PRECISION NOT NULL,
    "toCRSE" TEXT NOT NULL,
    "toSubject" TEXT NOT NULL,
    "toCredits" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,

    PRIMARY KEY ("fromCollege","fromCRSE","fromSubject","toCRSE","toSubject")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferCourse.id_unique" ON "TransferCourse"("id");
