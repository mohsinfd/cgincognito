/**
 * Database seed script
 * Populates bank codes and initial data
 */

const { Client } = require('pg');

const BANK_CODES = [
  { code: 'hdfc', name: 'HDFC', display_name: 'HDFC Bank' },
  { code: 'sbi', name: 'SBI', display_name: 'State Bank of India' },
  { code: 'icici', name: 'ICICI', display_name: 'ICICI Bank' },
  { code: 'axis', name: 'AXIS', display_name: 'Axis Bank' },
  { code: 'kotak', name: 'KOTAK', display_name: 'Kotak Mahindra Bank' },
  { code: 'hsbc', name: 'HSBC', display_name: 'HSBC Bank' },
  { code: 'sc', name: 'SC', display_name: 'Standard Chartered' },
  { code: 'citi', name: 'CITI', display_name: 'Citibank' },
  { code: 'amex', name: 'AMEX', display_name: 'American Express' },
  { code: 'indusind', name: 'INDUSIND', display_name: 'IndusInd Bank' },
  { code: 'yes', name: 'YES', display_name: 'Yes Bank' },
  { code: 'rbl', name: 'RBL', display_name: 'RBL Bank' },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Seeding bank codes...');
    for (const bank of BANK_CODES) {
      await client.query(
        `INSERT INTO bank_codes (code, name, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, display_name = EXCLUDED.display_name`,
        [bank.code, bank.name, bank.display_name]
      );
    }

    console.log(`✓ Seeded ${BANK_CODES.length} bank codes`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

