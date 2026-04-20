-- migrations/schema.sql

-- Users: both clients and barbers (distinguished by role)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client','barber','admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barber Shops: one barber owns one shop (expandable)
CREATE TABLE barber_shops (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services offered by the shop (e.g. haircut, beard trim)
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES barber_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL
);

-- Working hours slots for the shop by day of week (0=Sun,6=Sat)
CREATE TABLE working_hours (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES barber_shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_hour TIME NOT NULL,
  end_hour TIME NOT NULL
);

-- Appointments made by clients
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES barber_shops(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('booked','cancelled','done')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);