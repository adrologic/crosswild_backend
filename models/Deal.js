const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  discountLabel: { type: String, default: '' },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  link: { type: String, default: '' },
  image: { type: String, default: '' },
  imageTrackingCode: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Deal', dealSchema);
