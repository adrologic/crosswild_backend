const CategoryHomeCard = require('../models/CategoryHomeCard');
const { makeCrud } = require('./_crudFactory');

module.exports = makeCrud({
  Model: CategoryHomeCard,
  resourceName: 'Category card',
});
