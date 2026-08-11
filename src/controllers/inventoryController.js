const express = require('express');
const router = express.Router();
const { readDB, writeDB, ensureUserTestCaseData } = require('../config/storage');
const { authenticateToken } = require('../middlewares/tokenAuth');

function computeStockStatus(quantity, minStock) {
  const q = Number(quantity) || 0;
  const min = Number(minStock) || 0;
  if (q <= 0) return 'Habis';
  if (q <= min) return 'Stok Menipis';
  return 'Tersedia';
}

function isValidName(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 1) return false;
  const forbiddenRegex = /[<>{}\[\]$%^*~#\\@]/;
  return !forbiddenRegex.test(text.trim());
}

// GET all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await ensureUserTestCaseData(userId);

    const userItems = db.items.filter(i => i.userId === userId);
    const userCategories = db.categories.filter(c => c.userId === userId);

    const itemsWithDetails = userItems.map(item => {
      const category = userCategories.find(c => c.id === item.categoryId);
      const status = computeStockStatus(item.quantity, item.minStock);
      return {
        ...item,
        status,
        categoryName: category ? category.name : 'Kategori Utama',
        categoryCode: category ? category.code : 'KAT-001',
        categoryLocation: category ? category.location : 'Rak General',
        categoryColor: category ? category.color : '#000000'
      };
    });

    res.json(itemsWithDetails);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data barang gudang.' });
  }
});

// CREATE item
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { sku, name, categoryId, newCategoryName, description, quantity, minStock, unit, price, supplier } = req.body;

    if (!name || !isValidName(name)) {
      return res.status(400).json({ error: 'Nama Barang wajib diisi.' });
    }

    const db = await readDB();
    const userId = req.user.id;

    let targetCatId = categoryId;
    if (newCategoryName && newCategoryName.trim().length > 0) {
      const createdCat = {
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        code: 'KAT-' + Math.floor(100 + Math.random() * 900),
        name: newCategoryName.trim(),
        location: 'Rak Storage',
        manager: 'Staf Utama',
        capacity: 500,
        color: '#000000'
      };
      db.categories.push(createdCat);
      targetCatId = createdCat.id;
    } else if (!targetCatId || targetCatId === '' || targetCatId === 'CREATE_NEW') {
      let existingCat = db.categories.find(c => c.userId === userId);
      if (!existingCat) {
        existingCat = {
          id: 'cat_' + Date.now() + '_def',
          userId,
          code: 'KAT-GEN',
          name: 'Kategori Utama',
          location: 'Rak General A-01',
          manager: 'Staf Utama',
          capacity: 1000,
          color: '#000000'
        };
        db.categories.push(existingCat);
      }
      targetCatId = existingCat.id;
    }

    const initialQty = parseInt(quantity) >= 0 ? parseInt(quantity) : 0;
    const minQty = parseInt(minStock) >= 0 ? parseInt(minStock) : 5;

    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      categoryId: targetCatId,
      sku: sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      description: description || '',
      quantity: initialQty,
      minStock: minQty,
      unit: unit || 'Pcs',
      price: parseFloat(price) || 0,
      supplier: supplier || 'Supplier Utama',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.items.push(newItem);

    if (initialQty > 0) {
      const initialLog = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        itemId: newItem.id,
        itemSku: newItem.sku,
        itemName: newItem.name,
        type: 'IN',
        quantity: initialQty,
        prevQuantity: 0,
        newQuantity: initialQty,
        notes: 'Pencatatan barang baru ke inventaris',
        timestamp: new Date().toISOString()
      };
      db.logs.push(initialLog);
    }

    await writeDB(db);

    const category = db.categories.find(c => c.id === targetCatId);
    res.status(201).json({
      ...newItem,
      status: computeStockStatus(newItem.quantity, newItem.minStock),
      categoryName: category ? category.name : 'Kategori Utama',
      categoryCode: category ? category.code : 'KAT-GEN',
      categoryLocation: category ? category.location : 'Rak General',
      categoryColor: category ? category.color : '#000000'
    });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Gagal membuat barang baru.' });
  }
});

// UPDATE item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, categoryId, newCategoryName, description, minStock, unit, price, supplier } = req.body;

    const db = await readDB();
    const index = db.items.findIndex(i => i.id === id && i.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    if (name !== undefined && !isValidName(name)) {
      return res.status(400).json({ error: 'Nama barang tidak valid.' });
    }

    const current = db.items[index];
    let targetCatId = categoryId !== undefined ? categoryId : current.categoryId;

    if (newCategoryName && newCategoryName.trim().length > 0) {
      const createdCat = {
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: req.user.id,
        code: 'KAT-' + Math.floor(100 + Math.random() * 900),
        name: newCategoryName.trim(),
        location: 'Rak Storage',
        manager: 'Staf Utama',
        capacity: 500,
        color: '#000000'
      };
      db.categories.push(createdCat);
      targetCatId = createdCat.id;
    }

    db.items[index] = {
      ...current,
      sku: sku !== undefined ? sku : current.sku,
      name: name !== undefined ? name.trim() : current.name,
      categoryId: targetCatId,
      description: description !== undefined ? description : current.description,
      minStock: minStock !== undefined ? parseInt(minStock) : current.minStock,
      unit: unit !== undefined ? unit : current.unit,
      price: price !== undefined ? parseFloat(price) : current.price,
      supplier: supplier !== undefined ? supplier : current.supplier,
      updatedAt: new Date().toISOString()
    };

    await writeDB(db);

    const category = db.categories.find(c => c.id === db.items[index].categoryId);
    res.json({
      ...db.items[index],
      status: computeStockStatus(db.items[index].quantity, db.items[index].minStock),
      categoryName: category ? category.name : 'Kategori Utama',
      categoryCode: category ? category.code : 'KAT-GEN',
      categoryLocation: category ? category.location : 'Rak General',
      categoryColor: category ? category.color : '#000000'
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate barang.' });
  }
});

// ADJUST STOCK (Stock In / Stock Out)
router.post('/:id/adjust-stock', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, notes } = req.body;

    if (!['IN', 'OUT'].includes(type)) {
      return res.status(400).json({ error: 'Tipe penyesuaian stok harus IN atau OUT.' });
    }

    const qtyChange = parseInt(amount);
    if (isNaN(qtyChange) || qtyChange <= 0) {
      return res.status(400).json({ error: 'Jumlah unit mutasi harus lebih dari 0.' });
    }

    const db = await readDB();
    const index = db.items.findIndex(i => i.id === id && i.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    const item = db.items[index];
    const prevQty = item.quantity;
    let newQty = prevQty;

    if (type === 'IN') {
      newQty += qtyChange;
    } else if (type === 'OUT') {
      if (qtyChange > prevQty) {
        return res.status(400).json({ error: `Stok tidak mencukupi! Stok saat ini: ${prevQty} ${item.unit}.` });
      }
      newQty -= qtyChange;
    }

    db.items[index].quantity = newQty;
    db.items[index].updatedAt = new Date().toISOString();

    const logEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: req.user.id,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      type,
      quantity: qtyChange,
      prevQuantity: prevQty,
      newQuantity: newQty,
      notes: notes || (type === 'IN' ? 'Barang Masuk / Restock' : 'Barang Keluar / Terpakai'),
      timestamp: new Date().toISOString()
    };

    db.logs.push(logEntry);

    await writeDB(db);

    const category = db.categories.find(c => c.id === item.categoryId);
    res.json({
      item: {
        ...db.items[index],
        status: computeStockStatus(db.items[index].quantity, db.items[index].minStock),
        categoryName: category ? category.name : 'Kategori Utama',
        categoryCode: category ? category.code : 'KAT-GEN',
        categoryLocation: category ? category.location : 'Rak General',
        categoryColor: category ? category.color : '#000000'
      },
      log: logEntry
    });
  } catch (err) {
    console.error('Adjust stock error:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok barang.' });
  }
});

// DELETE item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    const itemIndex = db.items.findIndex(i => i.id === id && i.userId === req.user.id);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    db.items.splice(itemIndex, 1);
    await writeDB(db);

    res.json({ message: 'Barang berhasil dihapus dari inventaris.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus barang.' });
  }
});

module.exports = router;
