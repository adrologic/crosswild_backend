const SizeChart = require('../models/SizeChart');

exports.getAll = async (req, res) => {
  try {
    const charts = await SizeChart.find().sort({ name: 1 }).lean();
    res.json({ success: true, charts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByName = async (req, res) => {
  try {
    const { id } = req.params;
    let chart;
    if (id.match(/^[0-9a-fA-F]{24}$/)) chart = await SizeChart.findById(id);
    if (!chart) chart = await SizeChart.findOne({ name: id });
    if (!chart) return res.status(404).json({ success: false, message: 'Size chart not found' });
    res.json({ success: true, chart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const chart = await SizeChart.create(req.body);
    res.status(201).json({ success: true, chart });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const chart = await SizeChart.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chart) return res.status(404).json({ success: false, message: 'Size chart not found' });
    res.json({ success: true, chart });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const chart = await SizeChart.findByIdAndDelete(req.params.id);
    if (!chart) return res.status(404).json({ success: false, message: 'Size chart not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
