require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database connection...\n');
  
  // 1. Show which DATABASE_URL is being used
  console.log('📋 Environment variables:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
  console.log(`   Is using LOCAL database: ${process.env.DATABASE_URL.includes('localhost:5432')}`);
  console.log(`   Is using NEON database: ${process.env.DATABASE_URL.includes('neon.tech')}\n`);

  // 2. Test connection and get database info
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `;
    const dbInfo = result[0];
    console.log('🗄️  Database server info:');
    console.log(`   Database name: ${dbInfo.database_name}`);
    console.log(`   Username: ${dbInfo.username}`);
    console.log(`   Server address: ${dbInfo.server_address}`);
    console.log(`   Server port: ${dbInfo.server_port}\n`);
  } catch (e) {
    console.log('⚠️  Could not fetch server info (expected if using local socket)\n');
  }

  // 3. Check if the Progress table has the farthestPositionSec column
  try {
    const columnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Progress' 
        AND column_name = 'farthestPositionSec'
      ) as column_exists;
    `;
    const exists = columnExists[0].column_exists;
    console.log('✅ Column verification:');
    console.log(`   Progress.farthestPositionSec exists in database: ${exists}`);
    
    if (exists) {
      // Get column details
      const columnDetails = await prisma.$queryRaw`
        SELECT data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'Progress' 
        AND column_name = 'farthestPositionSec';
      `;
      const details = columnDetails[0];
      console.log(`   Data type: ${details.data_type}`);
      console.log(`   Is nullable: ${details.is_nullable}`);
      console.log(`   Default value: ${details.column_default}`);
    } else {
      console.log('❌ Column is missing! Run: npx prisma db execute --stdin <<EOF\nALTER TABLE "Progress" ADD COLUMN IF NOT EXISTS "farthestPositionSec" INTEGER NOT NULL DEFAULT 0;\nEOF');
    }
  } catch (e) {
    console.log('❌ Error checking column existence:', e.message);
  }

  // 4. Count records in Progress table
  try {
    const count = await prisma.progress.count();
    console.log(`\n📊 Total records in Progress table: ${count}`);
  } catch (e) {
    console.log('⚠️  Could not count Progress records:', e.message);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});