const db = require('./db');

const productColumns = [
  'barcode',
  'factoryItemNo',
  'productImagePath',
  'exportImagePath',
  'description',
  'innerPack',
  'cartonQty',
  'cbmPerCarton',
  'unitPieces',
  'price',
  'stock',
  'location'
];

const orderColumns = [
  'orderNo',
  'type',
  'customerName',
  'customerPhone',
  'contactName',
  'paymentMethod',
  'paidStatus',
  'paidAmount',
  'accountingNotes',
  'companyAddress',
  'deliveryAddress',
  'orderTime',
  'deliveryTime',
  'notes',
  'frontMarkImagePath',
  'sideMarkImagePath',
  'barcodeFilePath',
  'attachmentsJson'
];

function asNumber(value) {
  return Number(value || 0);
}

function getPayload(row) {
  if (!row) return null;
  if (row.attachmentsJson) {
    row.attachments = JSON.parse(row.attachmentsJson || '[]');
  }
  return row;
}

function addHistory(table, idName, id, action, payload) {
  db.prepare(`INSERT INTO ${table} (${idName}, action, payload) VALUES (?, ?, ?)`).run(id, action, JSON.stringify(payload || {}));
}

function listProducts() {
  return db.prepare('SELECT * FROM products ORDER BY updatedAt DESC, id DESC').all();
}

function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function getProductByBarcode(barcode) {
  return db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
}

function createProduct(payload) {
  const data = normalizeProduct(payload);
  const keys = productColumns;
  const result = db
    .prepare(`INSERT INTO products (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
    .run(...keys.map((key) => data[key]));
  const id = Number(result.lastInsertRowid);
  addHistory('product_history', 'productId', id, 'created', payload);
  return getProduct(id);
}

function updateProduct(id, payload) {
  if (!getProduct(id)) return null;
  const data = normalizeProduct(payload);
  db.prepare(
    `UPDATE products SET ${productColumns.map((key) => `${key} = ?`).join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(...productColumns.map((key) => data[key]), id);
  addHistory('product_history', 'productId', id, 'updated', payload);
  return getProduct(id);
}

function normalizeProduct(payload) {
  return {
    barcode: payload.barcode || null,
    factoryItemNo: payload.factoryItemNo || payload.name || '',
    productImagePath: payload.productImagePath || payload.imageUrl || '',
    exportImagePath: payload.exportImagePath || payload.productImagePath || payload.imageUrl || '',
    description: payload.description || payload.productDescription || '',
    innerPack: payload.innerPack || '',
    cartonQty: Math.round(asNumber(payload.cartonQty)),
    cbmPerCarton: asNumber(payload.cbmPerCarton),
    unitPieces: Math.round(asNumber(payload.unitPieces)),
    price: asNumber(payload.price),
    stock: Math.round(asNumber(payload.stock)),
    location: payload.location || ''
  };
}

function listOrders() {
  return db.prepare('SELECT * FROM orders WHERE deletedAt IS NULL ORDER BY createdAt DESC').all().map((row) => {
    const order = getPayload(row);
    order.statusStats = getOrderStatusStats(order.id);
    order.total = getOrderTotal(order.id);
    return order;
  });
}

function getOrder(id) {
  const order = getPayload(db.prepare('SELECT * FROM orders WHERE id = ? AND deletedAt IS NULL').get(id));
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE orderId = ? ORDER BY sortOrder ASC, id ASC').all(id);
  return order;
}

function createOrder(payload) {
  db.exec('BEGIN');
  try {
    const data = normalizeOrder(payload);
    const keys = orderColumns;
    const result = db
      .prepare(`INSERT INTO orders (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
      .run(...keys.map((key) => data[key]));
    const id = Number(result.lastInsertRowid);
    replaceOrderItems(id, payload.items || []);
    addHistory('order_history', 'orderId', id, 'created', payload);
    db.exec('COMMIT');
    return getOrder(id);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function updateOrder(id, payload) {
  if (!getOrder(id)) return null;
  db.exec('BEGIN');
  try {
    const data = normalizeOrder(payload);
    db.prepare(
      `UPDATE orders SET ${orderColumns.map((key) => `${key} = ?`).join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...orderColumns.map((key) => data[key]), id);
    replaceOrderItems(id, payload.items || []);
    addHistory('order_history', 'orderId', id, 'updated', payload);
    db.exec('COMMIT');
    return getOrder(id);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function deleteOrder(id) {
  const order = getOrder(id);
  if (!order) return false;
  db.prepare('UPDATE orders SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  addHistory('order_history', 'orderId', id, 'deleted', { id });
  return true;
}

function updateOrderStatus(id, status, notes) {
  if (!getOrder(id)) return null;
  db.prepare('UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  addHistory('order_history', 'orderId', id, 'status_changed', { status, notes });
  return getOrder(id);
}

function normalizeOrder(payload) {
  return {
    orderNo: payload.orderNo || `SO-${Date.now()}`,
    type: payload.type || 'order',
    customerName: payload.customerName || '',
    customerPhone: payload.customerPhone || payload.phone || '',
    contactName: payload.contactName || '',
    paymentMethod: payload.paymentMethod || '',
    paidStatus: payload.paidStatus || 'unpaid',
    paidAmount: asNumber(payload.paidAmount),
    accountingNotes: payload.accountingNotes || '',
    companyAddress: payload.companyAddress || '',
    deliveryAddress: payload.deliveryAddress || payload.customerAddress || '',
    orderTime: payload.orderTime || '',
    deliveryTime: payload.deliveryTime || '',
    notes: payload.notes || '',
    frontMarkImagePath: payload.frontMarkImagePath || '',
    sideMarkImagePath: payload.sideMarkImagePath || '',
    barcodeFilePath: payload.barcodeFilePath || '',
    attachmentsJson: JSON.stringify(payload.attachments || [])
  };
}

function replaceOrderItems(orderId, items) {
  db.prepare('DELETE FROM order_items WHERE orderId = ?').run(orderId);
  const insert = db.prepare(
    `INSERT INTO order_items (
      orderId, productId, barcode, customerItemNo, factoryItemNo, productImagePath, exportImagePath,
      productDescription, innerPack, cartonQty, cartons, unitPrice, cbmPerCarton, unitPieces,
      totalCbm, totalPieces, totalAmount, lengthCm, widthCm, heightCm, grossWeight, netWeight,
      deliveryStatus, inspectionStatus, supplyStatus, warehouseStatus, deliveredCartons, signatureFilePath,
      deliveryNotes, sortOrder
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  items.forEach((item, index) => {
    const normalized = normalizeOrderItem(item);
    insert.run(
      orderId,
      normalized.productId,
      normalized.barcode,
      normalized.customerItemNo,
      normalized.factoryItemNo,
      normalized.productImagePath,
      normalized.exportImagePath,
      normalized.productDescription,
      normalized.innerPack,
      normalized.cartonQty,
      normalized.cartons,
      normalized.unitPrice,
      normalized.cbmPerCarton,
      normalized.unitPieces,
      normalized.totalCbm,
      normalized.totalPieces,
      normalized.totalAmount,
      normalized.lengthCm,
      normalized.widthCm,
      normalized.heightCm,
      normalized.grossWeight,
      normalized.netWeight,
      normalized.deliveryStatus,
      normalized.inspectionStatus,
      normalized.supplyStatus,
      normalized.warehouseStatus,
      normalized.deliveredCartons,
      normalized.signatureFilePath,
      normalized.deliveryNotes,
      index
    );
  });
}

function normalizeOrderItem(item) {
  const cartonQty = Math.round(asNumber(item.cartonQty));
  const cartons = Math.round(asNumber(item.cartons || item.quantity));
  const unitPrice = asNumber(item.unitPrice || item.price);
  const lengthCm = asNumber(item.lengthCm);
  const widthCm = asNumber(item.widthCm);
  const heightCm = asNumber(item.heightCm);
  const calculatedCbm = lengthCm && widthCm && heightCm ? (lengthCm * widthCm * heightCm) / 1000000 : 0;
  const cbmPerCarton = asNumber(item.cbmPerCarton) || calculatedCbm;
  const unitPieces = Math.round(asNumber(item.unitPieces));
  const totalPieces = Math.round(asNumber(item.totalPieces || cartonQty * cartons));
  const totalCbm = asNumber(item.totalCbm || cbmPerCarton * cartons);
  const totalAmount = asNumber(item.totalAmount || cartonQty * cartons * unitPrice);

  return {
    productId: item.productId ? Number(item.productId) : null,
    barcode: item.barcode || '',
    customerItemNo: item.customerItemNo || '',
    factoryItemNo: item.factoryItemNo || '',
    productImagePath: item.productImagePath || '',
    exportImagePath: item.exportImagePath || item.productImagePath || '',
    productDescription: item.productDescription || item.description || '',
    innerPack: item.innerPack || '',
    cartonQty,
    cartons,
    unitPrice,
    cbmPerCarton,
    unitPieces,
    totalCbm,
    totalPieces,
    totalAmount,
    lengthCm,
    widthCm,
    heightCm,
    grossWeight: asNumber(item.grossWeight),
    netWeight: asNumber(item.netWeight),
    deliveryStatus: item.deliveryStatus || 'pending',
    inspectionStatus: item.inspectionStatus || 'pending',
    supplyStatus: item.supplyStatus || 'normal',
    warehouseStatus: item.warehouseStatus || 'not_arrived',
    deliveredCartons: Math.round(asNumber(item.deliveredCartons)),
    signatureFilePath: item.signatureFilePath || '',
    deliveryNotes: item.deliveryNotes || ''
  };
}

function getOrderStatusStats(orderId) {
  const rows = db.prepare(
    `SELECT deliveryStatus, inspectionStatus, supplyStatus, warehouseStatus, COUNT(*) AS count
     FROM order_items WHERE orderId = ?
     GROUP BY deliveryStatus, inspectionStatus, supplyStatus, warehouseStatus`
  ).all(orderId);
  const stats = {
    total: 0,
    delivered: 0,
    pending: 0,
    arrived: 0,
    failed: 0,
    unavailable: 0
  };
  rows.forEach((row) => {
    stats.total += row.count;
    if (row.deliveryStatus === 'delivered') stats.delivered += row.count;
    if (row.deliveryStatus === 'pending') stats.pending += row.count;
    if (row.warehouseStatus === 'arrived') stats.arrived += row.count;
    if (row.inspectionStatus === 'failed') stats.failed += row.count;
    if (row.supplyStatus === 'unavailable') stats.unavailable += row.count;
  });
  return stats;
}

function getOrderTotal(orderId) {
  const row = db.prepare('SELECT SUM(totalAmount) AS total FROM order_items WHERE orderId = ?').get(orderId);
  return asNumber(row && row.total);
}

function getOrderHistory(orderId) {
  return db.prepare('SELECT * FROM order_history WHERE orderId = ? ORDER BY createdAt DESC').all(orderId);
}

function salesRows() {
  return listOrders().map((order) => {
    const items = db.prepare('SELECT totalAmount FROM order_items WHERE orderId = ?').all(order.id);
    const total = items.reduce((sum, item) => sum + asNumber(item.totalAmount), 0);
    return { ...order, total };
  });
}

function inventoryRows() {
  return db.prepare(
    `SELECT id, barcode, factoryItemNo AS name, barcode, stock, price, location, description,
      innerPack, cartonQty, cbmPerCarton, unitPieces, productImagePath, exportImagePath
     FROM products ORDER BY stock ASC`
  ).all();
}

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch (error) {
    return row.value;
  }
}

function saveSetting(key, value) {
  db.prepare(
    `INSERT INTO app_settings (key, value, updatedAt)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`
  ).run(key, JSON.stringify(value));
  return getSetting(key);
}

module.exports = {
  listProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  getOrderHistory,
  salesRows,
  inventoryRows,
  getSetting,
  saveSetting
};
