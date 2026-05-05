const db = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    factoryItemNo TEXT,
    productImagePath TEXT,
    exportImagePath TEXT,
    description TEXT,
    innerPack TEXT,
    cartonQty INTEGER DEFAULT 0,
    cbmPerCarton REAL DEFAULT 0,
    unitPieces INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    location TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNo TEXT UNIQUE,
    type TEXT DEFAULT 'order',
    status TEXT DEFAULT 'pending',
    customerName TEXT,
    customerPhone TEXT,
    contactName TEXT,
    paymentMethod TEXT,
    companyAddress TEXT,
    deliveryAddress TEXT,
    orderTime TEXT,
    deliveryTime TEXT,
    notes TEXT,
    frontMarkImagePath TEXT,
    sideMarkImagePath TEXT,
    barcodeFilePath TEXT,
    attachmentsJson TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    deletedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    productId INTEGER,
    barcode TEXT,
    customerItemNo TEXT,
    factoryItemNo TEXT,
    productImagePath TEXT,
    exportImagePath TEXT,
    productDescription TEXT,
    innerPack TEXT,
    cartonQty INTEGER DEFAULT 0,
    cartons INTEGER DEFAULT 0,
    unitPrice REAL DEFAULT 0,
    cbmPerCarton REAL DEFAULT 0,
    unitPieces INTEGER DEFAULT 0,
    totalCbm REAL DEFAULT 0,
    totalPieces INTEGER DEFAULT 0,
    totalAmount REAL DEFAULT 0,
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(productId) REFERENCES products(id)
  )`,
  `CREATE TABLE IF NOT EXISTS order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER,
    action TEXT,
    payload TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(orderId) REFERENCES orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS product_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER,
    action TEXT,
    payload TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(productId) REFERENCES products(id)
  )`
];

const initDb = async () => {
  statements.forEach((statement) => db.exec(statement));
};

module.exports = initDb;
