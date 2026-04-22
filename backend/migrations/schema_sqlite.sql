PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client','barber','admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Barber Shops
CREATE TABLE IF NOT EXISTS barber_shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  phone TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  duration_minutes INTEGER NOT NULL,
  FOREIGN KEY(shop_id) REFERENCES barber_shops(id) ON DELETE CASCADE
);

-- Working hours
CREATE TABLE IF NOT EXISTS working_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_hour TEXT NOT NULL,
  end_hour TEXT NOT NULL,
  FOREIGN KEY(shop_id) REFERENCES barber_shops(id) ON DELETE CASCADE
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  shop_id INTEGER NOT NULL,
  service_id INTEGER,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('booked','cancelled','done')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id) REFERENCES barber_shops(id) ON DELETE CASCADE,
  FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE SET NULL
);
