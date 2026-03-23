const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
  },
  tagline: {
    type: String,
    trim: true,
    default: '',
  },
  shortDescription: {
    type: String,
    default: '',
  },
  // CMS-driven content sections (admin adds/removes dynamically)
  sections: [{
    title: { type: String, required: true },
    content: { type: String, required: true },
  }],
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  category: {
    type: String,
    default: '',
  },
  // Multi-category + subcategory selection (matches navbar structure)
  productCategories: [{
    category: { type: String, required: true },       // slug e.g. 'tshirts'
    subcategories: [{ type: String }],                // slugs e.g. ['dry-fit','cotton']
  }],
  // Reference to ProductType for dynamic type info
  productType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
  },
  image: {
    type: String,
    required: [true, 'Product image is required'],
  },
  imageTrackingCode: {
    type: String,
    index: true,
  },
  imagePublicId: {
    type: String,
  },
  subImages: [{
    url: { type: String },
    trackingCode: { type: String },
    publicId: { type: String },
  }],
  sizes: [{
    type: String,
  }],
  colors: [{
    type: String,
  }],
  // Dynamic details based on product type (key-value pairs)
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Admin-defined custom fields (label + value pairs)
  customFields: [{
    label: { type: String, required: true },
    value: { type: String, required: true },
  }],
  bestSeller: {
    type: Boolean,
    default: false,
  },
  newArrival: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  trending: {
    type: Boolean,
    default: false,
  },
  mostPopular: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // SEO fields
  seo: {
    title: {
      type: String,
      maxlength: 70,
    },
    description: {
      type: String,
      maxlength: 160,
    },
    keywords: [{
      type: String,
    }],
    ogImage: {
      type: String,
    },
    canonicalUrl: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

// Auto-populate category from first productCategories entry
productSchema.pre('save', function () {
  if (this.productCategories && this.productCategories.length > 0 && !this.category) {
    this.category = this.productCategories[0].category;
  }
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, bestSeller: 1, newArrival: 1, featured: 1 });
productSchema.index({ 'productCategories.category': 1 });

module.exports = mongoose.model('Product', productSchema);
