const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
  },
  paragraph: {
    type: String,
    required: [true, 'Blog content is required'],
  },
  image: {
    type: String,
    required: [true, 'Blog image is required'],
  },
  imageTrackingCode: {
    type: String,
    index: true,
  },
  imagePublicId: {
    type: String,
  },
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required'],
    },
    image: {
      type: String,
      default: '/images/blog/author-default.png',
    },
    imageTrackingCode: {
      type: String,
    },
    designation: {
      type: String,
      default: 'Content Writer',
    },
  },
  tags: [{
    type: String,
  }],
  publishDate: {
    type: String,
    default: () => new Date().getFullYear().toString(),
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  showOnHome: {
    type: Boolean,
    default: false,
    index: true,
  },
  views: {
    type: Number,
    default: 0,
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

// Auto-generate slug from title if not provided
blogSchema.pre('save', async function () {
  if (!this.slug && this.title) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Blog.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

// Index for better search performance
blogSchema.index({ title: 'text', paragraph: 'text' });
blogSchema.index({ tags: 1, publishDate: -1 });

module.exports = mongoose.model('Blog', blogSchema);
