// backend/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Provide a development fallback for JWT_SECRET to avoid startup errors
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set. Using temporary development secret. Set JWT_SECRET in .env for production.');
  process.env.JWT_SECRET = 'dev_secret_change_me';
}

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server and attach Socket.IO for real-time events
const http = require('http');
const server = http.createServer(app);
const { Server: IOServer } = require('socket.io');
// Enable CORS for frontend domain (adjust in production)
const allowedOrigins = [process.env.FRONTEND_URL, 'https://abdbarber.netlify.app'].filter(Boolean);
const corsOptions = allowedOrigins.length ? { origin: allowedOrigins } : {};

const io = new IOServer(server, {
  cors: corsOptions
});

// Make io available to routes via app.locals
app.locals.io = io;

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  // allow joining room per barber id
  socket.on('join', (room) => {
    socket.join(room);
  });
  socket.on('join_barber_room', (payload) => {
    if (payload && payload.barberId) {
      socket.join(`barber_${payload.barberId}`);
    }
  });

  socket.on('client_booking_started', async (payload) => {
    try {
      if (!payload || !payload.shopId) return;
      const shopResult = await dbModule.query('SELECT owner_id FROM barber_shops WHERE id = $1', [payload.shopId]);
      if (shopResult.rows.length === 0) return;
      const ownerId = shopResult.rows[0].owner_id;
      io.to(`barber_${ownerId}`).emit('client_booking_started', {
        shopId: payload.shopId,
        shopName: payload.shopName,
        clientName: payload.clientName,
        step: payload.step
      });
    } catch (err) {
      console.error('Socket activity error:', err);
    }
  });

  socket.on('client_booking_confirmed', async (payload) => {
    try {
      if (!payload || !payload.shopId) return;
      const shopResult = await dbModule.query('SELECT owner_id FROM barber_shops WHERE id = $1', [payload.shopId]);
      if (shopResult.rows.length === 0) return;
      const ownerId = shopResult.rows[0].owner_id;
      io.to(`barber_${ownerId}`).emit('client_booking_confirmed', {
        shopId: payload.shopId,
        shopName: payload.shopName,
        clientName: payload.clientName,
        serviceName: payload.serviceName,
        startTime: payload.startTime
      });
    } catch (err) {
      console.error('Socket confirmation error:', err);
    }
  });

    const pool = dbInfo.pool;

    if (dbInfo.type === 'pg') {
      const schemaPath = path.join(__dirname, 'migrations', 'schema.sql');
      const seedPath = path.join(__dirname, 'migrations', 'seed.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await pool.query(schemaSQL);
      console.log('✓ Postgres schema applied');
      await pool.query(seedSQL);
      console.log('✓ Postgres seed applied');
    } else if (dbInfo.type === 'sqlite') {
      const schemaPath = path.join(__dirname, 'migrations', 'schema_sqlite.sql');
      const seedPath = path.join(__dirname, 'migrations', 'seed_sqlite.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      // sqlite wrapper supports statements; run them sequentially
      const stmts = schemaSQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const s of stmts) {
        await pool.query(s + ';');
      }
      console.log('✓ SQLite schema applied');
      const seeds = seedSQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const s of seeds) {
        await pool.query(s + ';');
      }
      console.log('✓ SQLite seed applied');
    }
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err);
  }
}

(async () => {
  await runMigrations();
})();

// Security middleware
app.use(helmet());
app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json()); 

// Serve frontend static files so backend can host the site in dev/prod
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  standardHeaders: true
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', bookingsRoutes);
app.use('/api/book', bookingsRoutes); // Legacy route for booking endpoint

// Fallback: serve frontend index for any other GET (SPA-friendly)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handling (basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
