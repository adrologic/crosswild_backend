const mongoose = require('mongoose');

const homeProductHighlightSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  image: { type: String, default: '' },
  imageTrackingCode: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  link: { type: String, default: '' },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('HomeProductHighlight', homeProductHighlightSchema);
