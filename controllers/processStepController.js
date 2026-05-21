const ProcessStep = require('../models/ProcessStep');
const { makeCrud } = require('./_crudFactory');

const base = makeCrud({
  Model: ProcessStep,
  resourceName: 'Process step',
  imageField: 'image',
  folder: 'general',
  sort: { order: 1, createdAt: 1 },
  findHook: (query, req) => {
    if (req.query.page) query.page = { $in: [req.query.page, 'both'] };
  },
});

module.exports = base;
