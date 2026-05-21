const ContactSubmission = require('../models/ContactSubmission');

exports.submit = async (req, res) => {
  try {
    const { name, email, phone = '', message, source = 'contact-page' } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'name, email and message are required' });
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const submission = await ContactSubmission.create({ name, email, phone, message, source, ipAddress });
    res.status(201).json({ success: true, message: 'Submission received', submission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const submissions = await ContactSubmission.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ success: true, submission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
