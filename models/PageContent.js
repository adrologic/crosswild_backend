const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema(
  {
    pageSlug: {
      type: String,
      required: true,
      trim: true,
    },
    sectionKey: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

pageContentSchema.index({ pageSlug: 1, sectionKey: 1 }, { unique: true });

module.exports = mongoose.model('PageContent', pageContentSchema);
