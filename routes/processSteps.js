const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { bindCrud } = require('../controllers/_crudFactory');
const ctrl = require('../controllers/processStepController');

bindCrud(router, requireAdmin, ctrl);

module.exports = router;
