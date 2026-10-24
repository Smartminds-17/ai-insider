-- Add isOnline and lastActiveAt columns to User table if they don't exist
DO $$
BEGIN
  -- Check both "User" and lowercase "user" to support all Prisma table naming scenarios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name IN ('User', 'user') AND column_name = 'isOnline') THEN
    ALTER TABLE "User" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name IN ('User', 'user') AND column_name = 'lastActiveAt') THEN
    ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
  END IF;
END $$;