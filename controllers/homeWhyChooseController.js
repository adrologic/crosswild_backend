const HomeWhyChoose = require('../models/HomeWhyChoose');
const { makeCrud } = require('./_crudFactory');

module.exports = makeCrud({
  Model: HomeWhyChoose,
  resourceName: 'Item',
});
