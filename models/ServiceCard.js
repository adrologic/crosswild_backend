const mongoose = require('mongoose');

const serviceImageSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  trackingCode: { type: String, default: '' },
  publicId: { type: String, default: '' },
}, { _id: false });

const serviceCardSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  slug: { type: String, trim: true, unique: true, sparse: true, index: true },
  intro: { type: String, default: '' },
  images: [serviceImageSchema],
  features: [{ type: String }],
  link: { type: String, default: '' },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Auto-slug from title
serviceCardSchema.pre('save', async function () {
  if (!this.slug && this.title) {
    let baseSlug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.ServiceCard.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

module.exports = mongoose.model('ServiceCard', serviceCardSchema);
