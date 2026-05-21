const mongoose = require('mongoose');

const sizeRowSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  chest: { type: String, default: '' },
  length: { type: String, default: '' },
  shoulder: { type: String, default: '' },
  // Free-form additional measurements
  extra: { type: Map, of: String, default: {} },
}, { _id: false });

const sizeChartSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    trim: true,
  },
  description: { type: String, default: '' },
  sizes: [sizeRowSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SizeChart', sizeChartSchema);
