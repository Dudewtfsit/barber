PRAGMA foreign_keys = ON;

-- Simple demo data: one barber, one client, one shop, two services, hours, and appointments
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (1, 'Demo Barber', 'barber@demo.com', 'demo-hash', 'barber');
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (2, 'Demo Client', 'client@demo.com', 'demo-hash', 'client');

INSERT OR IGNORE INTO barber_shops (id, owner_id, name, address, city, state, phone, description) VALUES (1, 1, 'Demo Barbershop', '123 Demo St', 'Demo City', 'DC', '(555) 555-5555', 'A cozy demo barbershop');

INSERT OR IGNORE INTO services (id, shop_id, name, price, duration_minutes) VALUES (1, 1, 'Haircut', 25.00, 30);
INSERT OR IGNORE INTO services (id, shop_id, name, price, duration_minutes) VALUES (2, 1, 'Beard Trim', 15.00, 15);

INSERT OR IGNORE INTO working_hours (id, shop_id, day_of_week, start_hour, end_hour) VALUES (1, 1, 1, '09:00', '17:00');
INSERT OR IGNORE INTO working_hours (id, shop_id, day_of_week, start_hour, end_hour) VALUES (2, 1, 2, '09:00', '17:00');
INSERT OR IGNORE INTO working_hours (id, shop_id, day_of_week, start_hour, end_hour) VALUES (3, 1, 3, '09:00', '17:00');

-- Appointments: one booked for today and one completed yesterday
INSERT OR IGNORE INTO appointments (id, client_id, shop_id, service_id, start_time, end_time, status) VALUES (1, 2, 1, 1, datetime('now', '+1 hour'), datetime('now', '+1 hour', '+30 minutes'), 'booked');
INSERT OR IGNORE INTO appointments (id, client_id, shop_id, service_id, start_time, end_time, status) VALUES (2, 2, 1, 2, datetime('now', '-1 day'), datetime('now', '-1 day', '+15 minutes'), 'done');
