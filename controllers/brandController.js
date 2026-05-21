const Brand = require('../models/Brand');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'general';

async function processImage(body) {
  if (body.logoImageData) {
    const result = await uploadToImgBB(body.logoImageData, 'base64', FOLDER);
    body.logoImage = result.url;
    body.logoTrackingCode = result.trackingCode;
    body.logoPublicId = result.publicId;
    delete body.logoImageData;
  }
}

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    const brands = await Brand.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const brand = await Brand.create(body);
    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const brand = await Brand.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
