const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '',
  },
  // Parent category reference (null = top-level category)
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  description: {
    type: String,
    default: '',
  },
  // Rich HTML description for category page (like old site's WYSIWYG)
  richDescription: {
    type: String,
    default: '',
  },
  // Secondary description block
  description1: {
    type: String,
    default: '',
  },
  // Category image (728px x 455px recommended)
  image: {
    type: String,
    default: '',
  },
  imagePublicId: {
    type: String,
    default: '',
  },
  // SEO URL slug (e.g., "school-laptop-bag-manufacturer-in-Jaipur")
  seoUrl: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
  },
  // SEO fields (matching old site format + advanced features)
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
    canonicalUrl: {
      type: String,
    },
    ogImage: {
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
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Auto-generate seoUrl from name if not provided
categorySchema.pre('save', async function () {
  if (!this.seoUrl && this.name) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Category.findOne({ seoUrl: slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.seoUrl = slug;
  }
});

module.exports = mongoose.model('Category', categorySchema);
