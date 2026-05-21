const Menu = require('../models/Menu');

exports.getAll = async (req, res) => {
  try {
    const menus = await Menu.find().lean();
    res.json({ success: true, menus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByKey = async (req, res) => {
  try {
    const menu = await Menu.findOne({ key: req.params.key }).lean();
    if (!menu) return res.json({ success: true, menu: { key: req.params.key, items: [] } });
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsert = async (req, res) => {
  try {
    const { key, items } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'key is required' });
    const menu = await Menu.findOneAndUpdate(
      { key },
      { items: Array.isArray(items) ? items : [] },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, menu });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Menu.findOneAndDelete({ key: req.params.key });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
