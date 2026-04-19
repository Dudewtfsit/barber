// backend/routes/services.js
const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const router = express.Router();

// Add a new service
router.post('/services',
  authenticateToken, authorizeRoles('barber'),
  body('name').notEmpty(),
  body('price').isNumeric(),
  body('duration_minutes').isInt({ min: 1 }),
async (req, res) => {
  const { name, price, duration_minutes } = req.body;
  const userId = req.user.id;
  try {
    // Get the barber's shop ID
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) {
      return res.status(400).json({ message: 'Create a shop first' });
    }
    const shopId = shopResult.rows[0].id;
    const insertResult = await pool.query(
      'INSERT INTO services (shop_id, name, price, duration_minutes) VALUES ($1, $2, $3, $4) RETURNING *',
      [shopId, name, price, duration_minutes]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding service' });
  }
});

// List services for this barber's shop
router.get('/services', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const userId = req.user.id;
  try {
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) {
      return res.json([]); // no shop, no services
    }
    const shopId = shopResult.rows[0].id;
    const servicesResult = await pool.query('SELECT * FROM services WHERE shop_id = $1', [shopId]);
    res.json(servicesResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List services for the shop (public for clients)
router.get('/public/services', async (req, res) => {
  try {
    // Assuming shopId=1 for single shop
    const result = await pool.query('SELECT * FROM services WHERE shop_id = 1');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;