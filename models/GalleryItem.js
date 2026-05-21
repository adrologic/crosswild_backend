const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true },
  alt: { type: String, default: '' },
  image: { type: String, required: [true, 'Image is required'] },
  imageTrackingCode: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  category: { type: String, default: '', index: true },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('GalleryItem', galleryItemSchema);
