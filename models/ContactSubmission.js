const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
  phone: { type: String, default: '', trim: true },
  message: { type: String, required: [true, 'Message is required'] },
  source: { type: String, default: 'contact-page' },
  status: {
    type: String,
    enum: ['new', 'read', 'handled', 'archived'],
    default: 'new',
    index: true,
  },
  ipAddress: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
