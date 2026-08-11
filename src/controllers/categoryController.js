const express = require('express');
const router = express.Router();
const { readDB, writeDB, ensureUserTestCaseData } = require('../config/storage');
const { authenticateToken } = require('../middlewares/tokenAuth');

function isValidName(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 2) return false;
  const forbiddenRegex = /[<>{}\[\]$%^*~#\\@]/;
  return !forbiddenRegex.test(text.trim());
}

// GET all categories for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await ensureUserTestCaseData(userId);
    const userCategories = db.categories.filter(c => c.userId === userId);
    res.json(userCategories);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data kategori gudang.' });
  }
});

// CREATE category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, location, manager, capacity, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama Kategori wajib diisi.' });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ error: 'Nama Kategori tidak boleh mengandung karakter khusus.' });
    }

    const db = await readDB();
    const newCategory = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: req.user.id,
      code: code || 'KAT-' + Math.floor(100 + Math.random() * 900),
      name,
      location: location || 'Rak Umum',
      manager: manager || 'Staf Gudang',
      capacity: parseInt(capacity) || 500,
      color: color || '#3b82f6'
    };

    db.categories.push(newCategory);
    await writeDB(db);

    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat kategori gudang baru.' });
  }
});

// UPDATE category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, manager, capacity, color } = req.body;

    const db = await readDB();
    const index = db.categories.findIndex(c => c.id === id && c.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    if (name !== undefined && !isValidName(name)) {
      return res.status(400).json({ error: 'Nama Kategori tidak valid.' });
    }

    db.categories[index] = {
      ...db.categories[index],
      name: name !== undefined ? name : db.categories[index].name,
      code: code !== undefined ? code : db.categories[index].code,
      location: location !== undefined ? location : db.categories[index].location,
      manager: manager !== undefined ? manager : db.categories[index].manager,
      capacity: capacity !== undefined ? parseInt(capacity) : db.categories[index].capacity,
      color: color !== undefined ? color : db.categories[index].color
    };

    await writeDB(db);
    res.json(db.categories[index]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate kategori gudang.' });
  }
});

// DELETE category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    const catIndex = db.categories.findIndex(c => c.id === id && c.userId === req.user.id);
    if (catIndex === -1) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    db.categories.splice(catIndex, 1);
    db.items = db.items.filter(item => !(item.categoryId === id && item.userId === req.user.id));

    await writeDB(db);
    res.json({ message: 'Kategori dan barang terkait berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus kategori gudang.' });
  }
});

module.exports = router;
