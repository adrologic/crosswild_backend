const Product = require('../models/Product');
const { uploadToImgBB } = require('../utils/imgbbUpload');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      sub,
      bestSeller,
      newArrival,
      featured,
      trending,
      mostPopular,
      search,
      page = 1,
      limit: rawLimit = 50
    } = req.query;

    const limit = Math.min(Math.max(1, Number(rawLimit) || 50), 100);

    const query = { isActive: true };

    if (category && category !== 'all') {
      // Search in both legacy `category` field and new `productCategories` array
      query.$or = [
        { category },
        { 'productCategories.category': category },
      ];
      // If subcategory filter is provided
      if (sub) {
        query.$or = [
          { category, 'productCategories': { $elemMatch: { category, subcategories: sub } } },
          { 'productCategories': { $elemMatch: { category, subcategories: sub } } },
        ];
      }
    }
    if (bestSeller === 'true') query.bestSeller = true;
    if (newArrival === 'true') query.newArrival = true;
    if (featured === 'true') query.featured = true;
    if (trending === 'true') query.trending = true;
    if (mostPopular === 'true') query.mostPopular = true;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query)
      .populate('productType', 'name slug icon detailFields hasSizes hasColors customSizes')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProducts: count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by ID or slug
// @route   GET /api/products/:idOrSlug
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    // Try by MongoDB ObjectId first, then by slug
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id)
        .populate('productType', 'name slug icon detailFields hasSizes hasColors customSizes');
    }
    if (!product) {
      product = await Product.findOne({ slug: id })
        .populate('productType', 'name slug icon detailFields hasSizes hasColors customSizes');
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Remove empty productType to avoid ObjectId cast error
    if (!productData.productType) {
      delete productData.productType;
    }

    // Upload image to Cloudinary if base64 provided
    if (productData.imageData) {
      try {
        const category = productData.category || 'general';
        const result = await uploadToImgBB(productData.imageData, 'base64', category);
        productData.image = result.url;
        productData.imageTrackingCode = result.trackingCode;
        productData.imagePublicId = result.publicId;
        delete productData.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Image upload failed: ${error.message}` });
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = req.body;

    // Remove empty productType to avoid ObjectId cast error
    if (!updateData.productType) {
      delete updateData.productType;
    }

    // Upload new image to Cloudinary if base64 provided
    if (updateData.imageData) {
      try {
        const category = updateData.category || product.category || 'general';
        const result = await uploadToImgBB(updateData.imageData, 'base64', category);
        updateData.image = result.url;
        updateData.imageTrackingCode = result.trackingCode;
        updateData.imagePublicId = result.publicId;
        delete updateData.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Image upload failed: ${error.message}` });
      }
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Private/Admin
exports.getProductStats = async (req, res) => {
  try {
    const total = await Product.countDocuments({ isActive: true });
    const inStock = await Product.countDocuments({ isActive: true, stock: { $gt: 0 } });
    const outOfStock = await Product.countDocuments({ isActive: true, stock: 0 });
    const bestSellers = await Product.countDocuments({ isActive: true, bestSeller: true });
    const newArrivals = await Product.countDocuments({ isActive: true, newArrival: true });
    const featured = await Product.countDocuments({ isActive: true, featured: true });

    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        inStock,
        outOfStock,
        bestSellers,
        newArrivals,
        featured,
        byCategory: categoryStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
