const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const { uploadToImgBB } = require('../utils/imgbbUpload');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// @desc    Upload image (multipart file)
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Convert buffer to base64 data URI
    const base64Image = req.file.buffer.toString('base64');
    const base64Data = `data:${req.file.mimetype};base64,${base64Image}`;

    // Use category/folder from request body, default to 'general'
    const folder = req.body.folder || req.body.category || 'general';

    const result = await uploadToImgBB(base64Data, 'base64', folder);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.url,
      trackingCode: result.trackingCode,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Upload image from base64
// @route   POST /api/upload/base64
// @access  Private/Admin
router.post('/base64', requireAdmin, async (req, res) => {
  try {
    const { imageData, folder, category } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const result = await uploadToImgBB(imageData, 'base64', folder || category || 'general');

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.url,
      trackingCode: result.trackingCode,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
