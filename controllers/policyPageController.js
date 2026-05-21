const PolicyPage = require('../models/PolicyPage');

exports.getAll = async (req, res) => {
  try {
    const pages = await PolicyPage.find().sort({ slug: 1 }).lean();
    res.json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const page = await PolicyPage.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!page) return res.status(404).json({ success: false, message: 'Policy page not found' });
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsert = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.slug) return res.status(400).json({ success: false, message: 'slug is required' });
    body.lastUpdated = new Date();
    const page = await PolicyPage.findOneAndUpdate(
      { slug: body.slug },
      body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, page });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await PolicyPage.findOneAndDelete({ slug: req.params.slug });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
