const Blog = require('../models/Blog');
const { uploadToImgBB } = require('../utils/imgbbUpload');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getAllBlogs = async (req, res) => {
  try {
    const { search, tag, showOnHome, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(1, Number(rawLimit) || 20), 100);

    const query = { isPublished: true };

    if (search) query.$text = { $search: search };
    if (tag) query.tags = tag;
    if (showOnHome === 'true') query.showOnHome = true;

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single blog by ID or slug
// @route   GET /api/blogs/:idOrSlug
// @access  Public
exports.getBlog = async (req, res) => {
  try {
    const { id } = req.params;
    let blog;

    // Try by MongoDB ObjectId first, then by slug
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      );
    }
    if (!blog) {
      blog = await Blog.findOneAndUpdate(
        { slug: id },
        { $inc: { views: 1 } },
        { new: true }
      );
    }

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private/Admin
exports.createBlog = async (req, res) => {
  try {
    const blogData = req.body;

    // Upload featured image to Cloudinary if base64 provided
    if (blogData.imageData) {
      try {
        const result = await uploadToImgBB(blogData.imageData, 'base64', 'blogs');
        blogData.image = result.url;
        blogData.imageTrackingCode = result.trackingCode;
        blogData.imagePublicId = result.publicId;
        delete blogData.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Image upload failed: ${error.message}` });
      }
    }

    // Upload author image to Cloudinary if base64 provided
    if (blogData.author && blogData.author.imageData) {
      try {
        const result = await uploadToImgBB(blogData.author.imageData, 'base64', 'authors');
        blogData.author.image = result.url;
        blogData.author.imageTrackingCode = result.trackingCode;
        delete blogData.author.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Author image upload failed: ${error.message}` });
      }
    }

    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
exports.updateBlog = async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const updateData = req.body;

    // Upload new featured image to Cloudinary if base64 provided
    if (updateData.imageData) {
      try {
        const result = await uploadToImgBB(updateData.imageData, 'base64', 'blogs');
        updateData.image = result.url;
        updateData.imageTrackingCode = result.trackingCode;
        updateData.imagePublicId = result.publicId;
        delete updateData.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Image upload failed: ${error.message}` });
      }
    }

    // Upload new author image to Cloudinary if base64 provided
    if (updateData.author && updateData.author.imageData) {
      try {
        const result = await uploadToImgBB(updateData.author.imageData, 'base64', 'authors');
        updateData.author.image = result.url;
        updateData.author.imageTrackingCode = result.trackingCode;
        delete updateData.author.imageData;
      } catch (error) {
        return res.status(400).json({ success: false, message: `Author image upload failed: ${error.message}` });
      }
    }

    blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Blog updated successfully',
      blog,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    await blog.deleteOne();

    res.json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get blog statistics
// @route   GET /api/blogs/stats
// @access  Private/Admin
exports.getBlogStats = async (req, res) => {
  try {
    const total = await Blog.countDocuments({ isPublished: true });
    const totalViews = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } },
    ]);

    const topBlogs = await Blog.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(5)
      .select('title views');

    res.json({
      success: true,
      stats: {
        total,
        totalViews: totalViews[0]?.totalViews || 0,
        topBlogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
