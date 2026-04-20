// backend/routes/shop.js
const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const router = express.Router();

// Create or update the barber's shop
router.post('/shop', 
  authenticateToken, 
  authorizeRoles('barber'),
  body('name').notEmpty(),
  body('address').notEmpty(),
  body('city').notEmpty(),
  body('state').notEmpty(),
async (req, res) => {
  const { name, address, city, state } = req.body;
  const userId = req.user.id;
  try {
    // Check if shop exists for this barber
    const existing = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (existing.rows.length > 0) {
      // Update existing shop
      await pool.query(
        'UPDATE barber_shops SET name = $1, address = $2, city = $3, state = $4 WHERE owner_id = $5',
        [name, address, city, state, userId]
      );
      res.json({ message: 'Shop updated' });
    } else {
      // Create new shop
      await pool.query(
        'INSERT INTO barber_shops (owner_id, name, address, city, state) VALUES ($1, $2, $3, $4, $5)',
        [userId, name, address, city, state]
      );
      res.status(201).json({ message: 'Shop created' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get the barber's shop info
router.get('/shop', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query('SELECT * FROM barber_shops WHERE owner_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shops (public for clients)
router.get('/public/shops', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM barber_shops');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;