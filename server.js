// Import modules
require('dotenv').config(); // Memuat variabel dari .env
const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Package untuk koneksi PostgreSQL (NeonDB)

// Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// Setup koneksi NeonDB (PostgreSQL)
// Pastikan DATABASE_URL ada di file .env Anda!
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Diperlukan untuk NeonDB
  }
});

// Middleware
app.use(express.json()); // Untuk mem-parsing JSON dari body request
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan folder 'public'

// Fungsi untuk inisialisasi database (membuat tabel jika belum ada)
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Database table 'content' is ready.");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// === RUTE API ===

// GET: Mendapatkan semua konten
app.get('/api/content', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM content ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Membuat konten baru
app.post('/api/content', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO content (description) VALUES ($1) RETURNING *',
      [description]
    );
    res.status(201).json(rows[0]); // 201 = Created
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Mengupdate konten
app.put('/api/content/:id', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE content SET description = $1 WHERE id = $2 RETURNING *',
      [description, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE: Menghapus konten
app.delete('/api/content/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM content WHERE id = $1 RETURNING *',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json({ message: 'Content deleted' }); // atau res.sendStatus(204)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initDb(); // Inisialisasi DB saat server start
});