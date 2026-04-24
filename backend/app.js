const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server: IOServer } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const dbModule = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set. Using temporary development secret. Set JWT_SECRET in .env for production.');
  process.env.JWT_SECRET = 'dev_secret_change_me';
}

const app = express();
const PORT = process.env.PORT || 3002;
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://abdbarber.netlify.app'
].filter(Boolean);
const corsOptions = allowedOrigins.length ? { origin: allowedOrigins } : {};

const io = new IOServer(server, {
  cors: corsOptions
});

app.locals.io = io;

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

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

      const shopResult = await dbModule.query(
        'SELECT owner_id FROM barber_shops WHERE id = $1',
        [payload.shopId]
      );

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

      const shopResult = await dbModule.query(
        'SELECT owner_id FROM barber_shops WHERE id = $1',
        [payload.shopId]
      );

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
});

app.use(helmet());
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', bookingsRoutes);
app.use('/api/book', bookingsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

async function runSqliteStatements(pool, sql) {
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(`${statement};`);
  }
}

async function runMigrations() {
  const dbInfo = await dbModule.init();
  const pool = dbInfo.pool;

  if (dbInfo.type === 'pg') {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'schema.sql'),
      'utf8'
    );
    const seedSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'seed.sql'),
      'utf8'
    );

    await pool.query(schemaSQL);
    console.log('Postgres schema applied');
    await pool.query(seedSQL);
    console.log('Postgres seed applied');
    return;
  }

  const schemaSQL = fs.readFileSync(
    path.join(__dirname, 'migrations', 'schema_sqlite.sql'),
    'utf8'
  );
  const seedSQL = fs.readFileSync(
    path.join(__dirname, 'migrations', 'seed_sqlite.sql'),
    'utf8'
  );

  await runSqliteStatements(pool, schemaSQL);
  console.log('SQLite schema applied');
  await runSqliteStatements(pool, seedSQL);
  console.log('SQLite seed applied');
}

runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
