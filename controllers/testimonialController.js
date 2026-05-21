const Testimonial = require('../models/Testimonial');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'general';

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
    const testimonials = await Testimonial.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const testimonial = await Testimonial.create(body);
    res.status(201).json({ success: true, testimonial });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    await processImage(body);
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, testimonial });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
