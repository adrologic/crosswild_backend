const WhyChooseReason = require('../models/WhyChooseReason');
const { makeCrud } = require('./_crudFactory');

module.exports = makeCrud({
  Model: WhyChooseReason,
  resourceName: 'Reason',
});
