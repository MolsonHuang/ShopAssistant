const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_FILE || path.resolve(__dirname, 'shop.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

module.exports = db;
