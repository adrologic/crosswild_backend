const PageContent = require('../models/PageContent');

// GET /api/content/:pageSlug — all sections for a page
exports.getPageContent = async (req, res) => {
  try {
    const sections = await PageContent.find({
      pageSlug: req.params.pageSlug,
      isActive: true,
    }).select('-__v');

    const result = {};
    sections.forEach((s) => {
      result[s.sectionKey] = s.data;
    });

    res.json({ success: true, content: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/content/:pageSlug/:sectionKey — single section
exports.getSection = async (req, res) => {
  try {
    const section = await PageContent.findOne({
      pageSlug: req.params.pageSlug,
      sectionKey: req.params.sectionKey,
      isActive: true,
    });

    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, data: section.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/content/:pageSlug/:sectionKey — upsert a section (admin)
exports.upsertSection = async (req, res) => {
  try {
    const section = await PageContent.findOneAndUpdate(
      { pageSlug: req.params.pageSlug, sectionKey: req.params.sectionKey },
      { $set: { data: req.body.data, isActive: true } },
      { upsert: true, new: true }
    );
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/content — list all pages (admin)
exports.getAllPages = async (req, res) => {
  try {
    const pages = await PageContent.aggregate([
      { $group: { _id: '$pageSlug', sections: { $push: '$sectionKey' }, updatedAt: { $max: '$updatedAt' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/content/:pageSlug/:sectionKey (admin)
exports.deleteSection = async (req, res) => {
  try {
    await PageContent.findOneAndDelete({
      pageSlug: req.params.pageSlug,
      sectionKey: req.params.sectionKey,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
