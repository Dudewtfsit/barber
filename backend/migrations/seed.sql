-- migrations/seed.sql
-- Add one barber and one client
INSERT INTO users (name, email, password_hash, role)
VALUES 
  ('Alice Barber', 'alice@barbershop.com', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'barber'), 
  ('Bob Client', 'bob@client.com', '$2b$10$YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', 'client');

-- Create the barber's shop
INSERT INTO barber_shops (owner_id, name, address, city, state)
VALUES (1, 'Downtown Cuts', '123 Main St', 'Cityville', 'Stateland');

-- Add a sample service
INSERT INTO services (shop_id, name, price, duration_minutes)
VALUES (1, 'Regular Haircut', 20.00, 30);

-- Working hours: Monday-Friday 9am-5pm
INSERT INTO working_hours (shop_id, day_of_week, start_hour, end_hour)
VALUES 
  (1, 1, '09:00', '17:00'),
  (1, 2, '09:00', '17:00'),
  (1, 3, '09:00', '17:00'),
  (1, 4, '09:00', '17:00'),
  (1, 5, '09:00', '17:00');