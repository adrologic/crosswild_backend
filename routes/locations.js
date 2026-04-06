const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAllLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  seedLocations,
} = require('../controllers/locationController');

// Public routes
router.get('/', getAllLocations);
router.get('/:slug', getLocation);

// Admin routes
router.post('/seed', requireAdmin, seedLocations);
router.post('/', requireAdmin, createLocation);
router.put('/:id', requireAdmin, updateLocation);
router.delete('/:id', requireAdmin, deleteLocation);

module.exports = router;
