const Deal = require('../models/Deal');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'banners';

async function processImage(body) {
  if (body.imageData) {
    const result = await uploadToImgBB(body.imageData, 'base64', FOLDER);
    body.image = result.url;
    body.imageTrackingCode = result.trackingCode;
    body.imagePublicId = result.publicId;
    delete body.imageData;
  }
}

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    const deals = await Deal.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, deals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const deal = await Deal.create(body);
    res.status(201).json({ success: true, deal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const deal = await Deal.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, deal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
