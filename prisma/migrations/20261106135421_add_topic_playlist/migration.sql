-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "playlistChannelTitle" TEXT,
ADD COLUMN     "playlistId" TEXT,
ADD COLUMN     "playlistItemCount" INTEGER,
ADD COLUMN     "playlistThumbnailUrl" TEXT,
ADD COLUMN     "playlistTitle" TEXT;

-- CreateIndex
CREATE INDEX "Topic_playlistId_idx" ON "Topic"("playlistId");
