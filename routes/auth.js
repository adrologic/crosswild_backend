const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crosswild-secret-key-2026';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@thecrosswild.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// @desc    Admin login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const token = jwt.sign(
    { id: 1, email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: 1,
      name: 'Admin User',
      email,
      role: 'admin',
    },
  });
});

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

module.exports = router;
