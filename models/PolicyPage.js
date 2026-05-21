const mongoose = require('mongoose');

const policySectionSchema = new mongoose.Schema({
  heading: { type: String, default: '' },
  body: { type: String, default: '' }, // HTML
  order: { type: Number, default: 0 },
}, { _id: false });

const policyPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: { type: String, default: '' },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  intro: { type: String, default: '' }, // HTML
  sections: [policySectionSchema],
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PolicyPage', policyPageSchema);
