const Order = require('../models/Order');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit: rawLimit = 50 } = req.query;
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
    const orderData = req.body;

    const order = await Order.create(orderData);

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
      { new: true }
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
      { $match: { status: { $in: ['completed', 'processing'] } } },
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
