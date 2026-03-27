const Category = require('../models/Category');

// @desc    Get all categories (flat list, with optional filters)
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
  try {
    const { active, parent, root } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    // parent=<id> returns subcategories of that parent
    if (parent) {
      const parentCat = await Category.findOne({ id: parent }) || (parent.match(/^[0-9a-fA-F]{24}$/) ? await Category.findById(parent) : null);
      if (parentCat) query.parentCategory = parentCat._id;
      else query.parentCategory = parent;
    }
    // root=true returns only top-level categories
    if (root === 'true') query.parentCategory = null;

    const categories = await Category.find(query).populate('parentCategory', 'id name').sort({ name: 1 }).lean();

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get categories as nested tree (parents with subcategories)
// @route   GET /api/categories/tree
// @access  Public
exports.getCategoryTree = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;

    const allCategories = await Category.find(query).sort({ name: 1 }).lean();

    // Separate parents and children
    const parents = allCategories.filter(c => !c.parentCategory);
    const children = allCategories.filter(c => c.parentCategory);

    // Build tree
    const tree = parents.map(parent => ({
      ...parent,
      subcategories: children.filter(child =>
        child.parentCategory.toString() === parent._id.toString()
      ),
    }));

    res.json({ success: true, categories: tree });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single category by id or seoUrl
// @route   GET /api/categories/:idOrSlug
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let category;

    // Try by custom id field first, then by seoUrl, then by MongoDB _id
    category = await Category.findOne({ id }).populate('parentCategory', 'id name');
    if (!category) {
      category = await Category.findOne({ seoUrl: id }).populate('parentCategory', 'id name');
    }
    if (!category && id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(id).populate('parentCategory', 'id name');
    }

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Also fetch subcategories if this is a parent
    const subcategories = await Category.find({ parentCategory: category._id }).sort({ name: 1 }).lean();

    res.json({ success: true, category, subcategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    // If parentCategory is a string id (not ObjectId), resolve it
    if (req.body.parentCategory && typeof req.body.parentCategory === 'string') {
      if (!req.body.parentCategory.match(/^[0-9a-fA-F]{24}$/)) {
        const parentCat = await Category.findOne({ id: req.body.parentCategory });
        if (parentCat) {
          req.body.parentCategory = parentCat._id;
        } else {
          return res.status(400).json({ success: false, message: 'Parent category not found' });
        }
      }
    }

    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    // Find by custom id field first, then by MongoDB _id
    let category = await Category.findOne({ id: req.params.id });
    if (!category && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(req.params.id);
    }

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // If parentCategory is a string id (not ObjectId), resolve it
    if (req.body.parentCategory && typeof req.body.parentCategory === 'string') {
      if (!req.body.parentCategory.match(/^[0-9a-fA-F]{24}$/)) {
        const parentCat = await Category.findOne({ id: req.body.parentCategory });
        if (parentCat) {
          req.body.parentCategory = parentCat._id;
        } else {
          return res.status(400).json({ success: false, message: 'Parent category not found' });
        }
      }
    }

    // Update fields
    Object.assign(category, req.body);
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete category (and optionally its subcategories)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    let category = await Category.findOne({ id: req.params.id });
    if (!category && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(req.params.id);
    }

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Also delete subcategories
    const deletedSubs = await Category.deleteMany({ parentCategory: category._id });
    await category.deleteOne();

    res.json({
      success: true,
      message: `Category deleted successfully${deletedSubs.deletedCount > 0 ? ` (${deletedSubs.deletedCount} subcategories also removed)` : ''}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
