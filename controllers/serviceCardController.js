const ServiceCard = require('../models/ServiceCard');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'general';

// Process images[] which may contain a mix of:
//   { url, trackingCode, publicId } (already uploaded)
//   { imageData } (base64 — will be uploaded)
//   plain string URL
async function processImages(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const item of images) {
    if (!item) continue;
    if (typeof item === 'string') {
      out.push({ url: item });
    } else if (item.imageData) {
      const result = await uploadToImgBB(item.imageData, 'base64', FOLDER);
      out.push({ url: result.url, trackingCode: result.trackingCode, publicId: result.publicId });
    } else if (item.url) {
      out.push({ url: item.url, trackingCode: item.trackingCode || '', publicId: item.publicId || '' });
    }
  }
  return out;
}

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    const items = await ServiceCard.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    let item;
    if (id.match(/^[0-9a-fA-F]{24}$/)) item = await ServiceCard.findById(id);
    if (!item) item = await ServiceCard.findOne({ slug: id });
    if (!item) return res.status(404).json({ success: false, message: 'Service card not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (Array.isArray(body.images)) body.images = await processImages(body.images);
    const item = await ServiceCard.create(body);
    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    if (Array.isArray(body.images)) body.images = await processImages(body.images);
    const item = await ServiceCard.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Service card not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await ServiceCard.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Service card not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
