// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

// Register (client or barber)
router.post('/register',
  // Validation
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client','barber']).withMessage('Role must be client or barber'),
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, email, password, role } = req.body;

  try {
    // Check for existing user
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
      [name, email, password_hash, role]
    );

    const user = result.rows[0];
    // Issue JWT so client can be logged in immediately
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Database error' });
  }
});

// Login
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password is required'),
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Create JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// Additional profile endpoints
// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get any user's public profile (barber can view client profiles)
router.get('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User lookup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});