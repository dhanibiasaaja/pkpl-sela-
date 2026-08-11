const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('../config/storage');
const { authenticateToken, JWT_SECRET } = require('../middlewares/tokenAuth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, warehouseName, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });
    }

    const db = await readDB();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      warehouseName: warehouseName || 'Gudang Utama',
      role: role || 'Staf Operasional Gudang',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    await writeDB(db);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi akun gudang berhasil!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        warehouseName: newUser.warehouseName,
        role: newUser.role,
        avatar: newUser.avatar
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal melakukan registrasi.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi.' });
    }

    const db = await readDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        warehouseName: user.warehouseName || 'Gudang Utama',
        role: user.role || 'Staf Gudang',
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat login.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        warehouseName: user.warehouseName || 'Gudang Utama',
        role: user.role || 'Staf Gudang',
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data profil.' });
  }
});

module.exports = router;
