const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { publicSubmitLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/quoteSubmissionController');

// Public
router.post('/', publicSubmitLimiter, ctrl.submit);

// Admin
router.get('/', requireAdmin, ctrl.getAll);
router.put('/:id/status', requireAdmin, ctrl.updateStatus);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
