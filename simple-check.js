require('dotenv').config();
console.log('\n📋 DATABASE URL IN USE:');
console.log(process.env.DATABASE_URL);
console.log('\n✅ IS LOCAL DATABASE?', process.env.DATABASE_URL.includes('localhost:5432'));
console.log('❌ IS NEON DATABASE?', process.env.DATABASE_URL.includes('neon.tech'));