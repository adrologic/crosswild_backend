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
  // Content SEO
  getContentItemsWithSEO,
  updateProductSEO,
  updateBlogSEO,
  updateCategorySEO,
  bulkGenerateSEO,
} = require('../controllers/seoController');

// Public routes
router.get('/global', getGlobalSEO);
router.get('/pages', getAllPageSEO);
router.get('/pages/:path', getPageSEO);
router.get('/sitemap.xml', generateSitemap);
router.get('/robots.txt', getRobotsTxt);
router.get('/schemas', getSEOSchemas);

// Admin routes — pages
router.put('/global', requireAdmin, updateGlobalSEO);
router.post('/pages', requireAdmin, createOrUpdatePageSEO);
router.delete('/pages/:id', requireAdmin, deletePageSEO);
router.get('/stats', requireAdmin, getSEOStats);
router.put('/schemas', requireAdmin, updateSEOSchemas);

// Admin routes — content SEO
router.get('/content-items', requireAdmin, getContentItemsWithSEO);
router.put('/product/:id', requireAdmin, updateProductSEO);
router.put('/blog/:id', requireAdmin, updateBlogSEO);
router.put('/category/:id', requireAdmin, updateCategorySEO);
router.post('/bulk-generate', requireAdmin, bulkGenerateSEO);

module.exports = router;
