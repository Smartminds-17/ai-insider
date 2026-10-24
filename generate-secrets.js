// Run this with: node generate-secrets.js to create your production secrets
import crypto from 'crypto';

console.log('🔐 Generate these secrets for your Vercel environment variables:\n');

// NEXTAUTH_SECRET (needs to be base64)
const nextauthSecret = crypto.randomBytes(32).toString('base64');
console.log(`NEXTAUTH_SECRET="${nextauthSecret}"`);

// INTERNAL_API_SECRET (hex format)
const internalApiSecret = crypto.randomBytes(32).toString('hex');
console.log(`INTERNAL_API_SECRET="${internalApiSecret}"\n`);

console.log('📋 Copy these values into your Vercel project settings!');