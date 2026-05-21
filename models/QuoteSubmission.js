const mongoose = require('mongoose');

const quoteSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
  phone: { type: String, default: '', trim: true },
  enquiry: { type: String, required: [true, 'Enquiry is required'] },
  location: { type: String, default: '' },
  source: { type: String, default: 'location-page' },
  status: {
    type: String,
    enum: ['new', 'read', 'handled', 'archived'],
    default: 'new',
    index: true,
  },
  ipAddress: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('QuoteSubmission', quoteSubmissionSchema);
