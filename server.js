const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// Manual CORS handling — allows any origin, no external package needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

app.get('/api/calls', (req, res) => {
  const db = loadDB();
  res.json(db.calls);
});

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
