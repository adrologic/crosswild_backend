const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAllBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
} = require('../controllers/blogController');

// Public routes
router.get('/', getAllBlogs);
router.get('/stats', getBlogStats);
router.get('/:id', getBlog);

// Admin routes
router.post('/', requireAdmin, createBlog);
router.put('/:id', requireAdmin, updateBlog);
router.delete('/:id', requireAdmin, deleteBlog);

module.exports = router;
