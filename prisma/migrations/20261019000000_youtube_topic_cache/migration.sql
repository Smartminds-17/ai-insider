CREATE TABLE "YouTubeTopicCache" (
    "topicKey" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "videos" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YouTubeTopicCache_pkey" PRIMARY KEY ("topicKey")
);
