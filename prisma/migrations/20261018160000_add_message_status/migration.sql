-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'SEEN');

-- AddColumn
ALTER TABLE "Message"
ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT';

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");
