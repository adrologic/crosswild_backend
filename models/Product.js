const mongoose = require('mongoose');
const {
  generateProductCode,
  isValidProductCode,
  PRODUCT_CODE_INDEX,
} = require('../utils/productCode');

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
  // Public product code ("CW1482"). Issued automatically on create, unique,
  // and permanent once assigned — buyers quote it back over WhatsApp.
  // The unique index is declared below (a plain `index: true` here would
  // conflict with it: MongoDB refuses two indexes on the same key that differ
  // only in their options).
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
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
  // Minimum order quantity. The catalogue is bulk-only, so a new product is
  // 100 pieces unless it is given its own figure. There is deliberately no
  // maximum: orders have no upper limit.
  minOrderQuantity: {
    type: Number,
    default: 100,
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
  // Lighter versions of `image`, so a phone on a slow connection isn't asked to
  // download a full-size product photo to fill a 200px grid card.
  //   imageThumb — ~500px wide, used by cards, grids, menus and thumbnails.
  //   imageBlur  — ~1KB base64, stored inline and rendered instantly while the
  //                real photo loads. No second request, so it costs nothing.
  imageThumb: {
    type: String,
    default: '',
  },
  imageBlur: {
    type: String,
    default: '',
  },
  subImages: [{
    url: { type: String },
    thumbUrl: { type: String },
    blurData: { type: String },
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
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 300,
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
    otherMetaTags: {
      type: String,
      default: '',
    },
    noIndex: {
      type: Boolean,
      default: false,
    },
    noFollow: {
      type: Boolean,
      default: false,
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
}, {
  timestamps: true,
});

// Issue a product code to any document that doesn't have one, so every path
// that creates a product (admin panel, seed scripts, imports) gets one. This
// only picks the candidate — uniqueness is enforced by the index below, and
// callers should go through utils/productCode.js `saveWithProductCode` /
// `createProductWithCode` so a collision is retried instead of thrown.
productSchema.pre('validate', function () {
  if (!isValidProductCode(this.sku)) this.sku = generateProductCode();
});

// Auto-populate category from first productCategories entry
productSchema.pre('save', function () {
  if (this.productCategories && this.productCategories.length > 0 && !this.category) {
    this.category = this.productCategories[0].category;
  }
});

// Auto-generate slug from name if not provided
productSchema.pre('save', async function () {
  if (!this.slug && this.name) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    // Ensure uniqueness
    while (await mongoose.models.Product.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

// Product codes must be unique. Partial (rather than sparse) so that products
// still carrying the legacy empty-string sku don't all collide on '' while the
// backfill runs: `$gt: ''` indexes non-empty strings only.
// NOTE: scripts/backfillProductCodes.js drops the old non-unique `sku_1` index
// before creating this one — until it has run, MongoDB rejects this index with
// IndexOptionsConflict.
productSchema.index(
  { sku: 1 },
  { unique: true, name: PRODUCT_CODE_INDEX, partialFilterExpression: { sku: { $gt: '' } } }
);

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, bestSeller: 1, newArrival: 1, featured: 1 });
productSchema.index({ 'productCategories.category': 1 });

module.exports = mongoose.model('Product', productSchema);
