const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { getSiteSettings, updateSiteSettings } = require('../controllers/siteSettingsController');

router.get('/', getSiteSettings);
router.put('/', requireAdmin, updateSiteSettings);

module.exports = router;
