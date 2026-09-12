const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// Comma-separated list of allowed origins, e.g.
// ALLOWED_ORIGINS=https://laroche-customer.netlify.app,https://laroche-waiter.netlify.app
// Leave unset (or "*") during testing to allow any origin.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS
}));
app.use(express.json());

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { calls: [], nextId: 1 };
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!Array.isArray(parsed.calls)) parsed.calls = [];
    if (!parsed.nextId) parsed.nextId = 1;
    return parsed;
  } catch (e) {
    return { calls: [], nextId: 1 };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'laroche-cafe-backend' });
});

// List all calls (pending + resolved)
app.get('/api/calls', (req, res) => {
  const db = loadDB();
  res.json(db.calls);
});

// Create a new pending call
app.post('/api/calls', (req, res) => {
  const table_number = Number(req.body.table_number);
  if (!Number.isInteger(table_number) || table_number < 1 || table_number > 25) {
    return res.status(400).json({ error: 'table_number must be an integer between 1 and 25' });
  }
  const db = loadDB();
  const call = {
    id: db.nextId++,
    table_number,
    called_at: Date.now(),
    status: 'pending',
    resolved_at: null
  };
  db.calls.push(call);
  saveDB(db);
  res.status(201).json(call);
});

// Mark a call resolved
app.patch('/api/calls/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (status !== 'done' && status !== 'pending') {
    return res.status(400).json({ error: 'status must be "done" or "pending"' });
  }
  const db = loadDB();
  const call = db.calls.find(c => c.id === id);
  if (!call) return res.status(404).json({ error: 'call not found' });
  call.status = status;
  call.resolved_at = status === 'done' ? Date.now() : null;
  saveDB(db);
  res.json(call);
});

app.listen(PORT, () => {
  console.log(`Laroche Cafe backend running on port ${PORT}`);
});
