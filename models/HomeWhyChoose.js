const mongoose = require('mongoose');

const homeWhyChooseSchema = new mongoose.Schema({
  number: { type: String, default: '' }, // "01", "02", "03"
  title: { type: String, required: [true, 'Title is required'], trim: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('HomeWhyChoose', homeWhyChooseSchema);
