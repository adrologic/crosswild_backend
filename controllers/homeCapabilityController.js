const HomeCapability = require('../models/HomeCapability');
const { makeCrud } = require('./_crudFactory');

module.exports = makeCrud({
  Model: HomeCapability,
  resourceName: 'Capability',
  imageField: 'image',
  folder: 'general',
});
