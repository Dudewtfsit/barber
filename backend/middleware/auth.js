// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer TOKEN"
  if (!token) {
    console.log('Auth failed: Missing token');
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Auth failed: Invalid token', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;  // user contains { id, email, role }
    console.log('Auth successful:', { userId: user.id, role: user.role });
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('Authorization failed: No user in request');
      return res.status(403).json({ message: 'Forbidden - No user' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      console.log('Authorization failed: User role', req.user.role, 'not in allowed roles', allowedRoles);
      return res.status(403).json({ message: `Forbidden - User role '${req.user.role}' not allowed. Expected: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };