const mongoose = require('mongoose');

const categoryHomeCardSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  slug: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' }, // emoji
  link: { type: String, default: '' },
  popular: { type: Boolean, default: false },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('CategoryHomeCard', categoryHomeCardSchema);
