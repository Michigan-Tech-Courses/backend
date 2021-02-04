-- CreateTable
CREATE TABLE "PassFailDrop" (
    "courseSubject" TEXT NOT NULL,
    "courseCrse" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "section" TEXT NOT NULL,
    "failed" INTEGER NOT NULL,
    "dropped" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    PRIMARY KEY ("courseSubject","courseCrse","year","semester","section")
);
