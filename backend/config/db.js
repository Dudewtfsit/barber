// backend/config/db.js
const fs = require('fs');
require('dotenv').config();

const useSqliteEnv = (process.env.USE_SQLITE || '').toLowerCase() === 'true';

async function createPgPool() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // quick test query
  await pool.query('SELECT 1');
  pool.on('connect', () => console.log('Connected to the PostgreSQL database.'));
  return { type: 'pg', pool };
}

function createSqlitePool() {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.SQLITE_PATH || './backend/data.sqlite';
  // ensure directory exists
  try { fs.mkdirSync('./backend', { recursive: true }); } catch (e) {}
  const db = new sqlite3.Database(dbPath);

  // Wrap sqlite3 in an object with query(sql, params) returning Promise with rows
  const pool = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const trimmed = sql.trim().toUpperCase();
        // Use run for statements that don't return rows
        if (/^(INSERT|UPDATE|DELETE|CREATE|PRAGMA)/.test(trimmed)) {
          db.run(sql, params, function (err) {
            if (err) return reject(err);
            // mimic pg result
            resolve({ rows: [], lastID: this.lastID, changes: this.changes });
          });
        } else {
          db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve({ rows });
          });
        }
      });
    }
  };

  console.log('Using SQLite fallback at', dbPath);
  return { type: 'sqlite', pool, db };
}

// Export a promise-resolved pool object
let exported = { ready: false, type: null, pool: null, db: null };

async function init() {
  if (!useSqliteEnv && process.env.DATABASE_URL) {
    try {
      const { type, pool } = await createPgPool();
      exported = { ready: true, type, pool };
      return exported;
    } catch (err) {
      console.warn('Postgres connection failed, falling back to SQLite:', err.message);
    }
  }

  // Fallback to sqlite
  try {
    const { type, pool, db } = createSqlitePool();
    exported = { ready: true, type, pool, db };
    // enable foreign keys
    await pool.query('PRAGMA foreign_keys = ON');
    return exported;
  } catch (err) {
    console.error('SQLite initialization failed:', err);
    throw err;
  }
}

module.exports = { init, get: () => exported };