const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const initDb = require('./init-db');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/api', apiRoutes);
app.use('/app', express.static(path.resolve(__dirname, '../frontend/web')));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/vendor/zxing', express.static(path.resolve(__dirname, 'node_modules/@zxing/browser/umd')));

app.get('/', (req, res) => {
  res.redirect('/app/');
});

initDb()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Backend service started at http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
  });
