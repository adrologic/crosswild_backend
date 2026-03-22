const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getGlobalSEO,
  updateGlobalSEO,
  getAllPageSEO,
  getPageSEO,
  createOrUpdatePageSEO,
  deletePageSEO,
  generateSitemap,
  getRobotsTxt,
  getSEOStats,
  getSEOSchemas,
  updateSEOSchemas,
} = require('../controllers/seoController');

// Public routes
router.get('/global', getGlobalSEO);
router.get('/pages', getAllPageSEO);
router.get('/pages/:path', getPageSEO);
router.get('/sitemap.xml', generateSitemap);
router.get('/robots.txt', getRobotsTxt);
router.get('/schemas', getSEOSchemas);

// Admin routes
router.put('/global', requireAdmin, updateGlobalSEO);
router.post('/pages', requireAdmin, createOrUpdatePageSEO);
router.delete('/pages/:id', requireAdmin, deletePageSEO);
router.get('/stats', requireAdmin, getSEOStats);
router.put('/schemas', requireAdmin, updateSEOSchemas);

module.exports = router;
