const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/policyPageController');

router.get('/', ctrl.getAll);
router.get('/:slug', ctrl.getBySlug);
router.put('/', requireAdmin, ctrl.upsert);
router.post('/', requireAdmin, ctrl.upsert);
router.delete('/:slug', requireAdmin, ctrl.remove);

module.exports = router;
