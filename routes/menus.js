const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/menuController');

router.get('/', ctrl.getAll);
router.get('/:key', ctrl.getByKey);
router.put('/', requireAdmin, ctrl.upsert);
router.post('/', requireAdmin, ctrl.upsert);
router.delete('/:key', requireAdmin, ctrl.remove);

module.exports = router;
