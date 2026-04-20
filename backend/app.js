// backend/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3002;

// Auto-run migrations on startup
const pool = require('./config/db');
const schemaPath = path.join(__dirname, 'migrations', 'schema.sql');
const seedPath = path.join(__dirname, 'migrations', 'seed.sql');

async function runMigrations() {
  try {
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    await pool.query(schemaSQL);
    console.log('✓ Schema created');
    await pool.query(seedSQL);
    console.log('✓ Data seeded');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error('Migration error:', err);
    }
  }
}

runMigrations();

// Security middleware
app.use(helmet()); // sets secure HTTP headers【12†L169-L178】
app.disable('x-powered-by'); // reduce fingerprinting【12†L220-L228】

// Enable CORS for frontend domain (adjust in production)
const allowedOrigins = [process.env.FRONTEND_URL, 'https://abdbarber.netlify.app'].filter(Boolean);
app.use(cors({ origin: allowedOrigins })); // allow only our frontend origin【25†L211-L218】
app.use(express.json()); 

// Rate limiting to prevent abuse【23†L181-L184】
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  standardHeaders: true
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', shopRoutes);
app.use('/api', servicesRoutes);
app.use('/api', bookingsRoutes);

// Error handling (basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});