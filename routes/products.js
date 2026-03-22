const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} = require('../controllers/productController');

// Public routes
router.get('/', getAllProducts);
router.get('/stats', getProductStats);
router.get('/:id', getProduct);

// Admin routes
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);

module.exports = router;
