const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  href: { type: String, default: '' },
  order: { type: Number, default: 0 },
  children: [{
    label: { type: String, default: '' },
    href: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
}, { _id: false });

const menuSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Menu key is required'],
    enum: ['header-primary', 'header-mobile', 'footer-services', 'footer-quick-links', 'footer-bottom'],
    unique: true,
  },
  items: [menuItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
