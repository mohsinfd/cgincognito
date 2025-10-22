/**
 * Database migration script
 */

const { readFileSync } = require('fs');
const { Client } = require('pg');
const path = require('path');

async function migrate() {
  // Read DATABASE_URL from env
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

    console.log('Running schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

