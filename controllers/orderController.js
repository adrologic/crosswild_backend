const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search, page: rawPage = 1, limit: rawLimit = 50 } = req.query;
    const page = Math.max(1, parseInt(rawPage) || 1);
    const limit = Math.min(Math.max(1, Number(rawLimit) || 50), 100);

    const query = {};

    if (status && status !== 'all') query.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { orderNumber: { $regex: escaped, $options: 'i' } },
        { customerName: { $regex: escaped, $options: 'i' } },
        { customerEmail: { $regex: escaped, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.productId', 'name price')
      .lean();

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private/Admin
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.productId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Public
exports.createOrder = async (req, res) => {
  try {
    const body = req.body || {};

    // Whitelist item fields, coerce quantity, and use DB prices where possible
    const items = [];
    for (const raw of Array.isArray(body.items) ? body.items : []) {
      if (!raw) continue;
      const quantity = Math.max(1, Math.floor(Number(raw.quantity)) || 1);
      let price = Math.max(0, Number(raw.price) || 0);
      if (raw.productId && String(raw.productId).match(/^[0-9a-fA-F]{24}$/)) {
        const product = await Product.findById(raw.productId).select('price').lean();
        // Only trust the DB price when one is actually set — this B2B catalog
        // defaults price to 0, which would zero out every order total.
        if (product && typeof product.price === 'number' && product.price > 0) price = product.price;
      }
      items.push({
        productId: raw.productId,
        name: raw.name,
        price,
        quantity,
        size: raw.size,
        color: raw.color,
        image: raw.image,
      });
    }

    // Recompute total server-side — never trust the client total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderData = {
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      shippingAddress: body.shippingAddress ? {
        address: body.shippingAddress.address,
        city: body.shippingAddress.city,
        state: body.shippingAddress.state,
        pincode: body.shippingAddress.pincode,
      } : undefined,
      items,
      total,
      status: 'pending',
      paymentMethod: body.paymentMethod,
      notes: body.notes,
    };

    // Generate orderNumber server-side; retry on duplicate-key collisions
    let order;
    for (let attempt = 1; attempt <= 3; attempt++) {
      orderData.orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      try {
        order = await Order.create(orderData);
        break;
      } catch (err) {
        if (err.code === 11000 && attempt < 3) continue;
        throw err;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    const total = await Order.countDocuments();
    const pending = await Order.countDocuments({ status: 'pending' });
    const processing = await Order.countDocuments({ status: 'processing' });
    const completed = await Order.countDocuments({ status: 'completed' });
    const cancelled = await Order.countDocuments({ status: 'cancelled' });

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      stats: {
        total,
        pending,
        processing,
        completed,
        cancelled,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
