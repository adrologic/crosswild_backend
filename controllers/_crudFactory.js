const { uploadToImgBB } = require('../utils/imgbbUpload');

// Creates a generic CRUD controller bundle.
// opts:
//   Model        — mongoose model
//   resourceName — e.g. 'Item' (used in error messages and response key)
//   imageField   — base field name to handle base64 uploads ('image' or 'logoImage') — optional
//   folder       — Cloudinary folder for image uploads
//   sort         — find-sort object
//   findHook     — optional async function (query, req) to mutate the find query
//
// Image upload convention: client sends `<imageField>Data` (base64). Controller
// uploads and writes `<imageField>`, `<imageField>TrackingCode`, `<imageField>PublicId`.
function makeCrud({ Model, resourceName = 'Item', imageField, folder = 'general', sort = { order: 1, createdAt: -1 }, findHook }) {
  const ucName = resourceName;

  async function processImage(body) {
    if (!imageField) return;
    const dataKey = `${imageField}Data`;
    if (body[dataKey]) {
      const result = await uploadToImgBB(body[dataKey], 'base64', folder);
      body[imageField] = result.url;
      const baseCap = imageField.charAt(0).toUpperCase() + imageField.slice(1);
      // For `image` → imageTrackingCode/imagePublicId. For `logoImage` → logoTrackingCode/logoPublicId.
      if (imageField === 'image') {
        body.imageTrackingCode = result.trackingCode;
        body.imagePublicId = result.publicId;
      } else if (imageField === 'logoImage') {
        body.logoTrackingCode = result.trackingCode;
        body.logoPublicId = result.publicId;
      } else {
        body[`${imageField}TrackingCode`] = result.trackingCode;
        body[`${imageField}PublicId`] = result.publicId;
      }
      delete body[dataKey];
    }
  }

  return {
    getAll: async (req, res) => {
      try {
        const { active } = req.query;
        const query = {};
        if (active === 'true') query.isActive = true;
        if (findHook) await findHook(query, req);
        const items = await Model.find(query).sort(sort).lean();
        res.json({ success: true, items });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    getOne: async (req, res) => {
      try {
        const item = await Model.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: `${ucName} not found` });
        res.json({ success: true, item });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    create: async (req, res) => {
      try {
        const body = { ...req.body };
        await processImage(body);
        const item = await Model.create(body);
        res.status(201).json({ success: true, item });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    },

    update: async (req, res) => {
      try {
        const body = { ...req.body };
        await processImage(body);
        const item = await Model.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ success: false, message: `${ucName} not found` });
        res.json({ success: true, item });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    },

    remove: async (req, res) => {
      try {
        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: `${ucName} not found` });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },
  };
}

// Standard CRUD-routes binder.
function bindCrud(router, requireAdmin, ctrl) {
  router.get('/', ctrl.getAll);
  router.get('/:id', ctrl.getOne);
  router.post('/', requireAdmin, ctrl.create);
  router.put('/:id', requireAdmin, ctrl.update);
  router.delete('/:id', requireAdmin, ctrl.remove);
}

module.exports = { makeCrud, bindCrud };
