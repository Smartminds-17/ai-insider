-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "channelAvatarUrl" TEXT,
ADD COLUMN     "channelHandle" TEXT,
ADD COLUMN     "channelId" TEXT;

-- CreateIndex
CREATE INDEX "Video_channelId_idx" ON "Video"("channelId");
