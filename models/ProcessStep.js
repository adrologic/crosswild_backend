const mongoose = require('mongoose');

const processStepSchema = new mongoose.Schema({
  number: { type: String, default: '' }, // "01" / "1" / step indicator
  title: { type: String, required: [true, 'Title is required'], trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' }, // lucide icon name or emoji
  image: { type: String, default: '' },
  imageTrackingCode: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  page: {
    type: String,
    enum: ['home', 'our-process', 'both'],
    default: 'both',
    index: true,
  },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('ProcessStep', processStepSchema);
