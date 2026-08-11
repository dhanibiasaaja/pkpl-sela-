const express = require('express');
const cors = require('cors');
const path = require('path');
const authController = require('./src/controllers/authController');
const categoryController = require('./src/controllers/categoryController');
const inventoryController = require('./src/controllers/inventoryController');
const auditLogController = require('./src/controllers/auditLogController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authController);
app.use('/api/categories', categoryController);
app.use('/api/items', inventoryController);
app.use('/api/logs', auditLogController);

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API Endpoint tidak ditemukan.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Server Internal Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`📦 WareFlow Inventaris Gudang Server Berjalan di: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
