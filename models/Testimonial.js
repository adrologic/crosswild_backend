const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  designation: { type: String, default: '', trim: true },
  content: { type: String, required: [true, 'Content is required'] },
  image: { type: String, default: '' },
  imageTrackingCode: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 5 },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
