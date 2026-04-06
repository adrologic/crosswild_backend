const mongoose = require('mongoose');

const productDetailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  icon: { type: String, default: '📦' },
  link: { type: String, required: true },
  types: [{ type: String }],
  description: { type: String, default: '' },
}, { _id: false });

const locationContactSchema = new mongoose.Schema({
  address: { type: String, default: '' },
  phone: [{ type: String }],
  email: { type: String, default: '' },
  hours: { type: String, default: '' },
  mapLink: { type: String, default: '' },
}, { _id: false });

const locationPageSchema = new mongoose.Schema({
  // Core identity
  name: { type: String, required: [true, 'Location name is required'], trim: true },
  slug: { type: String, required: [true, 'Slug is required'], trim: true, unique: true, lowercase: true },
  state: { type: String, required: true, trim: true },
  isHeadquarters: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Hero content
  tagline: { type: String, default: '' },
  heroHeading: { type: String, default: '' },
  description: { type: String, default: '' },

  // Lists
  whyChooseUs: [{ type: String }],
  printingMethods: [{ type: String }],
  fabrics: [{ type: String }],
  partners: [{ type: String }],

  // Products offered at this location
  products: [productDetailSchema],

  // Contact info
  contact: { type: locationContactSchema, default: () => ({}) },

  // SEO
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: [{ type: String }],
    ogImage: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    noIndex: { type: Boolean, default: false },
    noFollow: { type: Boolean, default: false },
  },
}, { timestamps: true });

locationPageSchema.index({ slug: 1 });
locationPageSchema.index({ isActive: 1 });

module.exports = mongoose.model('LocationPage', locationPageSchema);
