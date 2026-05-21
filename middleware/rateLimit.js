const rateLimit = require('express-rate-limit');

// Simple per-IP rate limiters for public POST endpoints.
const publicSubmitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions. Please wait a minute and try again.',
  },
});

module.exports = { publicSubmitLimiter };
