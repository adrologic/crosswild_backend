const mongoose = require('mongoose');

const locationPageSchema = new mongoose.Schema({
  // ── Identity ────────────────────────────────────────────────────────────────
  slug: { type: String, required: [true, 'Slug is required'], trim: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },

  // ── SEO Landing Page fields ─────────────────────────────────────────────────
  h1:               { type: String, default: '' },
  metaTitle:        { type: String, default: '' },
  metaDescription:  { type: String, default: '' },

  city:             { type: String, default: '' },
  category:         { type: String, default: '' },
  categoryLabel:    { type: String, default: '' },

  introContent:     { type: String, default: '' },   // HTML
  mainContent:      { type: String, default: '' },   // HTML

  // CTA banner images shown mid-content (paths relative to /public)
  pageImages:       [{ type: String }],

  // Product image slider (4-up carousel)
  sliderImages:     [{ type: String }],

  branchAddress:    { type: String, default: '' },
  branchPhone:      { type: String, default: '' },
  branchHours:      { type: String, default: '' },
  mapLink:          { type: String, default: '' },
  mapEmbed:         { type: String, default: '' },

  image:            { type: String, default: '' },   // hero banner image URL

  showPrintingMethods: { type: Boolean, default: false },
  showFabrics:         { type: Boolean, default: false },
  showSizeChart:       { type: Boolean, default: false },

  printingMethods:  [{ type: String }],
  fabrics:          [{ type: String }],

  // ── Legacy city-page fields (kept so old records still read correctly) ──────
  name:         { type: String, default: '' },
  state:        { type: String, default: '' },
  isHeadquarters: { type: Boolean, default: false },
  tagline:      { type: String, default: '' },
  heroHeading:  { type: String, default: '' },
  description:  { type: String, default: '' },
  whyChooseUs:  [{ type: String }],
  partners:     [{ type: String }],

  contact: {
    address:  { type: String, default: '' },
    phone:    [{ type: String }],
    email:    { type: String, default: '' },
    hours:    { type: String, default: '' },
    mapLink:  { type: String, default: '' },
  },

  seo: {
    title:        { type: String, default: '' },
    description:  { type: String, default: '' },
    keywords:     [{ type: String }],
    ogImage:      { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    noIndex:      { type: Boolean, default: false },
    noFollow:     { type: Boolean, default: false },
  },
}, { timestamps: true });

locationPageSchema.index({ slug: 1 });
locationPageSchema.index({ isActive: 1 });

module.exports = mongoose.model('LocationPage', locationPageSchema);
