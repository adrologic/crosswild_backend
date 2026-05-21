const mongoose = require('mongoose');

const whyChooseReasonSchema = new mongoose.Schema({
  text: { type: String, required: [true, 'Text is required'] },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('WhyChooseReason', whyChooseReasonSchema);
