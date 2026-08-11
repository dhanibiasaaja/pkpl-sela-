const express = require('express');
const router = express.Router();
const { readDB } = require('../config/storage');
const { authenticateToken } = require('../middlewares/tokenAuth');

// GET transaction logs for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const userLogs = db.logs.filter(l => l.userId === req.user.id);
    userLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(userLogs);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil riwayat transaksi stok.' });
  }
});

module.exports = router;
