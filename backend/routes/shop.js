// backend/routes/shop.js
const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const router = express.Router();

// Create or update the barber's shop
router.post('/', 
  authenticateToken, 
  authorizeRoles('barber'),
  body('name').notEmpty(),
  body('address').notEmpty(),
  body('city').notEmpty(),
  body('state').notEmpty(),
async (req, res) => {
  const { name, address, city, state, phone, description } = req.body;
  const userId = req.user.id;
  try {
    // Check if shop exists for this barber
    const existing = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (existing.rows.length > 0) {
      // Update existing shop
      const result = await pool.query(
        'UPDATE barber_shops SET name = $1, address = $2, city = $3, state = $4, phone = $5, description = $6 WHERE owner_id = $7 RETURNING *',
        [name, address, city, state, phone || null, description || null, userId]
      );
      res.json({ message: 'Shop updated', shop: result.rows[0] });
    } else {
      // Create new shop
      const result = await pool.query(
        'INSERT INTO barber_shops (owner_id, name, address, city, state, phone, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, name, address, city, state, phone || null, description || null]
      );
      res.status(201).json({ message: 'Shop created', shop: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get the barber's shop info
router.get('/my-shop', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query('SELECT * FROM barber_shops WHERE owner_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-hours', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const userId = req.user.id;

  try {
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) {
      return res.json([]);
    }

    const hoursResult = await pool.query(
      'SELECT id, day_of_week, start_hour, end_hour FROM working_hours WHERE shop_id = $1 ORDER BY day_of_week',
      [shopResult.rows[0].id]
    );

    res.json(hoursResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/hours',
  authenticateToken,
  authorizeRoles('barber'),
  async (req, res) => {
    const userId = req.user.id;
    const { hours } = req.body;

    if (!Array.isArray(hours)) {
      return res.status(400).json({ message: 'Hours must be an array' });
    }

    try {
      const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length === 0) {
        return res.status(400).json({ message: 'Create a shop first' });
      }

      const shopId = shopResult.rows[0].id;
      await pool.query('DELETE FROM working_hours WHERE shop_id = $1', [shopId]);

      for (const entry of hours) {
        const dayOfWeek = Number(entry.day_of_week);
        const startHour = entry.start_hour;
        const endHour = entry.end_hour;

        if (
          Number.isNaN(dayOfWeek) ||
          dayOfWeek < 0 ||
          dayOfWeek > 6 ||
          !startHour ||
          !endHour ||
          startHour >= endHour
        ) {
          continue;
        }

        await pool.query(
          'INSERT INTO working_hours (shop_id, day_of_week, start_hour, end_hour) VALUES ($1, $2, $3, $4)',
          [shopId, dayOfWeek, startHour, endHour]
        );
      }

      const hoursResult = await pool.query(
        'SELECT id, day_of_week, start_hour, end_hour FROM working_hours WHERE shop_id = $1 ORDER BY day_of_week',
        [shopId]
      );

      res.json({ message: 'Working hours updated', hours: hoursResult.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get shop by ID (public for clients)
router.get('/:shopId', async (req, res) => {
  const { shopId } = req.params;
  try {
    const result = await pool.query('SELECT id, name, address, city, state, phone, description FROM barber_shops WHERE id = $1', [shopId]);
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
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, address, city, state, phone, description FROM barber_shops');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shop working hours
router.get('/hours/:shopId', async (req, res) => {
  const { shopId } = req.params;
  try {
    const result = await pool.query('SELECT day_of_week, start_hour, end_hour FROM working_hours WHERE shop_id = $1 ORDER BY day_of_week', [shopId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
