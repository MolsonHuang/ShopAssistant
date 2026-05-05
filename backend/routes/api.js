const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const dashboardController = require('../controllers/dashboardController');
const store = require('../store');
const { upload, toPublicPath } = require('../upload');
const { exportExcel, exportPdf } = require('../exporter');

router.get('/products', productController.list);
router.get('/products/barcode/:barcode', productController.byBarcode);
router.get('/products/:id', productController.details);
router.post('/products', productController.create);
router.put('/products/:id', productController.update);

router.get('/orders', orderController.list);
router.post('/orders', orderController.create);
router.get('/orders/:id', orderController.details);
router.put('/orders/:id', orderController.update);
router.delete('/orders/:id', orderController.remove);
router.post('/orders/:id/status', orderController.updateStatus);
router.get('/orders/:id/history', orderController.history);

router.post('/uploads/:kind', upload.array('files', 60), (req, res) => {
  res.json({
    files: req.files.map((file) => ({
      originalName: file.originalname,
      path: toPublicPath(file.path),
      mimeType: file.mimetype,
      size: file.size
    }))
  });
});

router.get('/orders/:id/export/excel', async (req, res) => {
  const outputPath = await exportExcel(req.params.id);
  if (!outputPath) return res.status(404).json({ error: 'Order not found' });
  res.download(outputPath);
});

router.get('/orders/:id/export/pdf', async (req, res) => {
  const outputPath = await exportPdf(req.params.id);
  if (!outputPath) return res.status(404).json({ error: 'Order not found' });
  res.download(outputPath);
});

router.get('/dashboard/sales', dashboardController.sales);
router.get('/dashboard/inventory', dashboardController.inventory);

router.get('/search', (req, res) => {
  res.json(store.search(req.query.q || ''));
});

router.get('/settings/:key', (req, res) => {
  res.json({ key: req.params.key, value: store.getSetting(req.params.key, null) });
});

router.put('/settings/:key', (req, res) => {
  res.json({ key: req.params.key, value: store.saveSetting(req.params.key, req.body.value) });
});

module.exports = router;
