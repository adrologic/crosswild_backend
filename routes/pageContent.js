const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getPageContent,
  getSection,
  upsertSection,
  getAllPages,
  deleteSection,
} = require('../controllers/pageContentController');

// Public
router.get('/', getAllPages);
router.get('/:pageSlug', getPageContent);
router.get('/:pageSlug/:sectionKey', getSection);

// Admin
router.put('/:pageSlug/:sectionKey', requireAdmin, upsertSection);
router.delete('/:pageSlug/:sectionKey', requireAdmin, deleteSection);

module.exports = router;
