const HomeProductHighlight = require('../models/HomeProductHighlight');
const { makeCrud } = require('./_crudFactory');

module.exports = makeCrud({
  Model: HomeProductHighlight,
  resourceName: 'Highlight',
  imageField: 'image',
  folder: 'general',
});
