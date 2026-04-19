const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const schemaPath = path.join(__dirname, 'migrations', 'schema.sql');
const seedPath = path.join(__dirname, 'migrations', 'seed.sql');

const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
const seedSQL = fs.readFileSync(seedPath, 'utf8');

async function migrate() {
  try {
    await pool.query(schemaSQL);
    console.log('Schema created');
    await pool.query(seedSQL);
    console.log('Data seeded');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();