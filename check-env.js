/**
 * Quick script to verify .env.local configuration
 * Run: node check-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking CardGenius Environment Configuration...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

console.log('📁 File Location:', envPath);
console.log('📄 File Exists:', envExists ? '✅ YES' : '❌ NO\n');

if (!envExists) {
  console.log('❌ ERROR: .env.local file not found!');
  console.log('\n💡 Solution:');
  console.log('1. Create .env.local in the project root');
  console.log('2. Or copy: Copy-Item .env.example .env.local');
  process.exit(1);
}

// Read and parse the file
const envContent = fs.readFileSync(envPath, 'utf8');
// Handle both Windows (CRLF) and Unix (LF) line endings
const lines = envContent.split(/\r?\n/);

console.log('\n📋 Checking Required Variables:\n');

const required = [
  'BOOST_API_KEY',
  'BOOST_API_SECRET',
  'BOOST_BASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
  'WEB_ORIGIN',
];

const found = {};
let hasIssues = false;

console.log(`📄 Total lines in file: ${lines.length}\n`);

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      found[key.trim()] = value;
    }
  }
});

console.log(`✅ Parsed ${Object.keys(found).length} variables\n`);

// DEBUG: Show what was actually found
console.log('🔎 Variables Found in File:');
Object.keys(found).forEach(key => {
  const value = found[key];
  const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
  console.log(`   - ${key}: ${preview}`);
});
console.log('');

required.forEach(key => {
  const value = found[key];
  const exists = !!value;
  const isDummy = value && (value.includes('dummy') || value.includes('your_') || value.includes('test_') || value.length < 10);
  
  if (!exists) {
    console.log(`❌ ${key}: MISSING`);
    hasIssues = true;
  } else if (isDummy && (key === 'BOOST_API_KEY' || key === 'BOOST_API_SECRET')) {
    console.log(`⚠️  ${key}: ${value.substring(0, 20)}... (DUMMY VALUE - will use MOCK MODE)`);
    hasIssues = true;
  } else {
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`✅ ${key}: ${preview}`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasIssues) {
  console.log('\n⚠️  ISSUES FOUND - App will run in MOCK MODE\n');
  console.log('To use REAL BoostScore API:');
  console.log('1. Update BOOST_API_KEY with real key (not dummy_key)');
  console.log('2. Update BOOST_API_SECRET with real secret');
  console.log('3. Restart server: npm run dev\n');
} else {
  console.log('\n✅ ALL REQUIRED VARIABLES CONFIGURED!\n');
  console.log('Your app should use REAL API mode.');
  console.log('If you still see mock data, try:');
  console.log('1. Stop server (Ctrl+C)');
  console.log('2. Delete cache: Remove-Item -Recurse -Force .next');
  console.log('3. Restart: npm run dev\n');
}

console.log('📊 Summary:');
console.log(`   Total variables found: ${Object.keys(found).length}`);
console.log(`   Required variables: ${required.filter(k => found[k]).length}/${required.length}`);
console.log('');
