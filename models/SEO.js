const mongoose = require('mongoose');

// Schema for page-specific SEO settings
const pageSEOSchema = new mongoose.Schema({
  pagePath: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  keywords: [{
    type: String,
  }],
  ogTitle: {
    type: String,
    maxlength: 200,
  },
  ogDescription: {
    type: String,
    maxlength: 500,
  },
  ogImage: {
    type: String,
  },
  twitterCard: {
    type: String,
    enum: ['summary', 'summary_large_image', 'app', 'player'],
    default: 'summary_large_image',
  },
  canonicalUrl: {
    type: String,
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
    type: mongoose.Schema.Types.Mixed, // JSON-LD structured data
  },
}, {
  timestamps: true,
});

// Schema for global SEO settings
const globalSEOSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'The CrossWild',
  },
  siteUrl: {
    type: String,
    default: 'https://thecrosswild.com',
  },
  defaultTitle: {
    type: String,
    default: 'The CrossWild - Custom Printing & Promotional Merchandise',
  },
  titleTemplate: {
    type: String,
    default: '%s | The CrossWild',
  },
  defaultDescription: {
    type: String,
    default: 'Premium custom printing services for T-shirts, caps, bags, mugs, and promotional merchandise. Quality printing with fast delivery across India.',
  },
  defaultKeywords: [{
    type: String,
  }],
  defaultOgImage: {
    type: String,
  },
  favicon: {
    type: String,
  },
  appleTouchIcon: {
    type: String,
  },
  // Social Media Links
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    youtube: String,
    whatsapp: String,
  },
  // Contact Info for Schema
  contactInfo: {
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  },
  // Organization Schema
  organizationSchema: {
    type: {
      type: String,
      default: 'Organization',
    },
    name: String,
    logo: String,
    description: String,
  },
  // Google Verification
  googleSiteVerification: {
    type: String,
  },
  // Google Analytics
  googleAnalyticsId: {
    type: String,
  },
  // Google Tag Manager
  googleTagManagerId: {
    type: String,
  },
  // Facebook Pixel
  facebookPixelId: {
    type: String,
  },
  // Custom head scripts
  customHeadScripts: {
    type: String,
  },
  // Robots.txt content
  robotsTxt: {
    type: String,
    default: `User-agent: *
Allow: /

Sitemap: https://thecrosswild.com/sitemap.xml`,
  },
  // LocalBusiness schema data
  localBusiness: {
    telephone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'IN' },
    },
    openingHours: { type: String, default: 'Mo-Sa 09:00-18:00' },
    priceRange: { type: String, default: '₹₹' },
  },
  // FAQ items for FAQ schema
  faqItems: [{
    question: String,
    answer: String,
  }],
  // Additional meta tags
  additionalMetaTags: [{
    name: String,
    content: String,
  }],
}, {
  timestamps: true,
});

// Ensure only one global settings document exists
globalSEOSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      defaultKeywords: [
        'custom printing',
        'promotional merchandise',
        't-shirt printing',
        'corporate gifts',
        'bulk printing',
        'custom mugs',
        'branded caps',
        'promotional bags',
      ],
    });
  }
  return settings;
};

const PageSEO = mongoose.model('PageSEO', pageSEOSchema);
const GlobalSEO = mongoose.model('GlobalSEO', globalSEOSchema);

module.exports = { PageSEO, GlobalSEO };
