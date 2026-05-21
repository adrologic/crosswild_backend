const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { publicSubmitLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/subscriberController');

// Public
router.post('/', publicSubmitLimiter, ctrl.subscribe);

// Admin
router.get('/', requireAdmin, ctrl.getAll);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
