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
    paidStatus TEXT DEFAULT 'unpaid',
    paidAmount REAL DEFAULT 0,
    accountingNotes TEXT,
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
    lengthCm REAL DEFAULT 0,
    widthCm REAL DEFAULT 0,
    heightCm REAL DEFAULT 0,
    grossWeight REAL DEFAULT 0,
    netWeight REAL DEFAULT 0,
    deliveryStatus TEXT DEFAULT 'pending',
    inspectionStatus TEXT DEFAULT 'pending',
    supplyStatus TEXT DEFAULT 'normal',
    warehouseStatus TEXT DEFAULT 'not_arrived',
    deliveredCartons INTEGER DEFAULT 0,
    signatureFilePath TEXT,
    deliveryNotes TEXT,
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
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`
];

const migrations = [
  "ALTER TABLE orders ADD COLUMN paidStatus TEXT DEFAULT 'unpaid'",
  "ALTER TABLE orders ADD COLUMN paidAmount REAL DEFAULT 0",
  "ALTER TABLE orders ADD COLUMN accountingNotes TEXT",
  "ALTER TABLE order_items ADD COLUMN lengthCm REAL DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN widthCm REAL DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN heightCm REAL DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN grossWeight REAL DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN netWeight REAL DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN deliveryStatus TEXT DEFAULT 'pending'",
  "ALTER TABLE order_items ADD COLUMN inspectionStatus TEXT DEFAULT 'pending'",
  "ALTER TABLE order_items ADD COLUMN supplyStatus TEXT DEFAULT 'normal'",
  "ALTER TABLE order_items ADD COLUMN warehouseStatus TEXT DEFAULT 'not_arrived'",
  "ALTER TABLE order_items ADD COLUMN deliveredCartons INTEGER DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN signatureFilePath TEXT",
  "ALTER TABLE order_items ADD COLUMN deliveryNotes TEXT"
];

const initDb = async () => {
  statements.forEach((statement) => db.exec(statement));
  migrations.forEach((statement) => {
    try {
      db.exec(statement);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
  });
};

module.exports = initDb;
