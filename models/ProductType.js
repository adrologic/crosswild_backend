const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product type name is required'],
    trim: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  icon: {
    type: String,
    default: '📦',
  },
  description: {
    type: String,
    default: '',
  },
  // Define what detail fields this product type supports
  // e.g., T-Shirts have "Fabric", "Sleeve Type", "Fit"
  // Bags have "Material", "Capacity", "Compartments"
  detailFields: [{
    fieldName: {
      type: String,
      required: true,
      trim: true,
    },
    fieldType: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect', 'boolean'],
      default: 'text',
    },
    // Options for select/multiselect fields
    options: [{
      type: String,
    }],
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: '',
    },
  }],
  // Whether this type supports sizes and colors
  hasSizes: {
    type: Boolean,
    default: true,
  },
  hasColors: {
    type: Boolean,
    default: true,
  },
  // Custom size options for this type (if different from default)
  customSizes: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Auto-generate slug from name before saving
productTypeSchema.pre('validate', function() {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('ProductType', productTypeSchema);
