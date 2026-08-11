const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  items: path.join(DATA_DIR, 'items.json'),
  logs: path.join(DATA_DIR, 'logs.json')
};

let isWriting = false;
const writeQueue = [];

async function ensureDir() {
  try {
    await fs.access(DATA_DIR);
  } catch (err) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function initDB() {
  await ensureDir();

  for (const [key, filePath] of Object.entries(FILES)) {
    try {
      await fs.access(filePath);
    } catch (err) {
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf8');
    }
  }
}

async function readEntity(name) {
  await initDB();
  const filePath = FILES[name];
  if (!filePath) return [];
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${name}.json:`, err);
    return [];
  }
}

async function writeEntity(name, items) {
  await initDB();
  const filePath = FILES[name];
  if (!filePath) return false;

  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
  return true;
}

async function readDB() {
  await initDB();
  const [users, categories, items, logs] = await Promise.all([
    readEntity('users'),
    readEntity('categories'),
    readEntity('items'),
    readEntity('logs')
  ]);

  return { users, categories, items, logs };
}

async function writeDB(data) {
  return new Promise((resolve, reject) => {
    const executeWrite = async () => {
      isWriting = true;
      try {
        await Promise.all([
          data.users ? writeEntity('users', data.users) : Promise.resolve(),
          data.categories ? writeEntity('categories', data.categories) : Promise.resolve(),
          data.items ? writeEntity('items', data.items) : Promise.resolve(),
          data.logs ? writeEntity('logs', data.logs) : Promise.resolve()
        ]);
        resolve(true);
      } catch (err) {
        console.error('Error writing JSON storage files:', err);
        reject(err);
      } finally {
        isWriting = false;
        if (writeQueue.length > 0) {
          const next = writeQueue.shift();
          next();
        }
      }
    };

    if (isWriting) {
      writeQueue.push(executeWrite);
    } else {
      executeWrite();
    }
  });
}

async function ensureUserTestCaseData(userId) {
  const db = await readDB();
  const userItems = db.items.filter(i => i.userId === userId);
  if (userItems.length > 0) return db;

  let cat = db.categories.find(c => c.userId === userId && c.name.toLowerCase() === 'elektronik');
  if (!cat) {
    cat = {
      id: `c_elektronik_${userId}`,
      userId,
      code: 'KAT-ELEK',
      name: 'Elektronik',
      location: 'Gudang Elektronik - Rak E-01',
      manager: 'Staf Gudang',
      capacity: 500,
      color: '#2563eb'
    };
    db.categories.push(cat);
  }

  const now = new Date().toISOString();
  const testCaseItems = [
    {
      tcId: 'TC-ITEM-01',
      sku: 'SKU-ELEK-001',
      name: 'Sensor Suhu IoT',
      description: 'Data barang valid (Test Case TC-ITEM-01)',
      quantity: 10,
      minStock: 5,
      unit: 'Pcs',
      price: 150000,
      supplier: 'PT Microtech Elektronik'
    },
    {
      tcId: 'TC-ITEM-02',
      sku: 'SKU-ELEK-002',
      name: 'Modul Sensor Relai',
      description: 'Data barang stok awal 0 (Test Case TC-ITEM-02: Status Habis)',
      quantity: 0,
      minStock: 5,
      unit: 'Unit',
      price: 45000,
      supplier: 'PT Microtech Elektronik'
    },
    {
      tcId: 'TC-ITEM-04',
      sku: 'SKU-ELEK-003',
      name: 'Kabel Jumper Dupoint',
      description: 'Data barang batas stok minimum 1 (Test Case TC-ITEM-04)',
      quantity: 50,
      minStock: 1,
      unit: 'Set',
      price: 12000,
      supplier: 'PT Microtech Elektronik'
    }
  ];

  testCaseItems.forEach((tcItem, idx) => {
    const itemId = `item_tc_${userId}_${idx + 1}`;
    db.items.push({
      id: itemId,
      userId,
      categoryId: cat.id,
      sku: tcItem.sku,
      name: tcItem.name,
      description: tcItem.description,
      quantity: tcItem.quantity,
      minStock: tcItem.minStock,
      unit: tcItem.unit,
      price: tcItem.price,
      supplier: tcItem.supplier,
      createdAt: now,
      updatedAt: now
    });

    if (tcItem.quantity > 0) {
      db.logs.push({
        id: `log_tc_${userId}_${idx + 1}`,
        userId,
        itemId,
        itemSku: tcItem.sku,
        itemName: tcItem.name,
        type: 'IN',
        quantity: tcItem.quantity,
        prevQuantity: 0,
        newQuantity: tcItem.quantity,
        notes: `Pencatatan barang baru dari test case ${tcItem.tcId}`,
        timestamp: now
      });
    }
  });

  await writeDB(db);
  return db;
}

module.exports = {
  readDB,
  writeDB,
  readEntity,
  writeEntity,
  ensureUserTestCaseData
};
