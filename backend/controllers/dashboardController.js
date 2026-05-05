const store = require('../store');

exports.sales = (req, res) => {
  res.json(store.salesRows());
};

exports.inventory = (req, res) => {
  res.json(store.inventoryRows());
};
