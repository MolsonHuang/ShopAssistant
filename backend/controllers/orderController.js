const store = require('../store');

exports.list = (req, res) => {
  res.json(store.listOrders());
};

exports.create = (req, res) => {
  const order = store.createOrder(req.body);
  res.status(201).json({ id: order.id });
};

exports.details = (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};

exports.update = (req, res) => {
  const order = store.updateOrder(req.params.id, req.body);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ updated: true });
};

exports.remove = (req, res) => {
  const deleted = store.deleteOrder(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Order not found' });
  res.json({ deleted: true });
};

exports.updateStatus = (req, res) => {
  const order = store.updateOrderStatus(req.params.id, req.body.status, req.body.notes);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ updated: true });
};

exports.history = (req, res) => {
  res.json(store.getOrderHistory(req.params.id));
};
