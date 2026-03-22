const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAllProductTypes,
  getProductType,
  createProductType,
  updateProductType,
  deleteProductType,
  seedProductTypes,
} = require('../controllers/productTypeController');

// Public routes
router.get('/', getAllProductTypes);
router.get('/:id', getProductType);

// Admin routes
router.post('/', requireAdmin, createProductType);
router.post('/seed', requireAdmin, seedProductTypes);
router.put('/:id', requireAdmin, updateProductType);
router.delete('/:id', requireAdmin, deleteProductType);

module.exports = router;
