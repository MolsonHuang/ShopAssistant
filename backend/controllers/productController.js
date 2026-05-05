const store = require('../store');

exports.list = (req, res) => {
  res.json(store.listProducts());
};

exports.details = (req, res) => {
  const product = store.getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

exports.byBarcode = (req, res) => {
  const product = store.getProductByBarcode(req.params.barcode);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

exports.create = (req, res) => {
  try {
    const product = store.createProduct(req.body);
    res.status(201).json({ id: product.id });
  } catch (error) {
    res.status(error.code === 'DUPLICATE_BARCODE' ? 409 : 500).json({ error: error.message });
  }
};

exports.update = (req, res) => {
  try {
    const product = store.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ updated: true });
  } catch (error) {
    res.status(error.code === 'DUPLICATE_BARCODE' ? 409 : 500).json({ error: error.message });
  }
};
