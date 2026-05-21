const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Brand name is required'], trim: true },
  logoImage: { type: String, default: '' },
  logoTrackingCode: { type: String, default: '' },
  logoPublicId: { type: String, default: '' },
  websiteUrl: { type: String, default: '' },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);
