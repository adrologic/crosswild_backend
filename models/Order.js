const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
  },
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    pincode: String,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String,
    image: String,
  }],
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['whatsapp', 'email', 'cod', 'online'],
    default: 'whatsapp',
  },
  notes: {
    type: String,
  },
  orderNumber: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
});

// Generate order number before saving
orderSchema.pre('save', function() {
  if (!this.orderNumber) {
    this.orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
});

// Index for search and filtering
orderSchema.index({ orderNumber: 1, customerEmail: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
