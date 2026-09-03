-- DropIndex
DROP INDEX "LearningPath_userId_idx";

-- DropIndex
DROP INDEX "Topic_learningPathId_idx";

-- CreateIndex
CREATE INDEX "LearningPath_userId_createdAt_idx" ON "LearningPath"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningPath_userId_status_idx" ON "LearningPath"("userId", "status");

-- CreateIndex
CREATE INDEX "Topic_learningPathId_order_idx" ON "Topic"("learningPathId", "order");

-- CreateIndex
CREATE INDEX "Topic_selectedVideoId_idx" ON "Topic"("selectedVideoId");
