const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
} = require('../controllers/orderController');

// Public routes
router.post('/', createOrder);

// Admin routes
router.get('/', requireAdmin, getAllOrders);
router.get('/stats', requireAdmin, getOrderStats);
router.get('/:id', requireAdmin, getOrder);
router.put('/:id/status', requireAdmin, updateOrderStatus);
router.delete('/:id', requireAdmin, deleteOrder);

module.exports = router;
