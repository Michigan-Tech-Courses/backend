-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "jobName" TEXT NOT NULL,
    "graphileJob" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobLog_createdAt_idx" ON "JobLog"("createdAt");
