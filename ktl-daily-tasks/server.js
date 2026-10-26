const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!MONGODB_URI || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('Set MONGODB_URI and a strong ADMIN_PASSWORD (at least 12 characters).');
  process.exit(1);
}
app.set('trust proxy', 1);
app.use(express.json({ limit: '30kb' }));
app.use(session({
  name: 'ktl.sid',
  secret: process.env.SESSION_SECRET || ADMIN_PASSWORD,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

let customers;
async function connectDb() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'ktl_daily_tasks');
  customers = db.collection('customer_tasks');
  await customers.createIndex({ createdAt: -1 });
  await customers.createIndex({ phone: 1 });
  await customers.createIndex({ vehicleNumber: 1 });
  console.log('MongoDB connected');
}
const auth = (req, res, next) => req.session.authenticated ? next() : res.status(401).json({ error: 'Please log in.' });
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'KTL Daily Tasks' }));
app.post('/api/login', (req, res) => {
  if (!req.body || typeof req.body.password !== 'string' || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Incorrect password.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Login failed.' });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/session', (req, res) => res.json({ authenticated: !!req.session.authenticated }));
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = q ? { $or: [
      { customerName: { $regex: escapeRegex(q), $options: 'i' } },
      { phone: { $regex: escapeRegex(q), $options: 'i' } },
      { chassisNumber: { $regex: escapeRegex(q), $options: 'i' } },
      { vehicleNumber: { $regex: escapeRegex(q), $options: 'i' } }
    ] } : {};
    const rows = await customers.find(filter).sort({ createdAt: -1 }).limit(1000).toArray();
    res.json(rows.map(x => ({ ...x, _id: String(x._id) })));
  } catch { res.status(500).json({ error: 'Could not load entries.' }); }
});
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const customerName = String(body.customerName || '').trim();
    const phone = String(body.phone || '').trim();
    const chassisNumber = String(body.chassisNumber || '').trim();
    const vehicleNumber = String(body.vehicleNumber || '').trim().toUpperCase();
    if (!customerName || !phone || !chassisNumber) return res.status(400).json({ error: 'Customer name, phone and chassis number are required.' });
    if (!/^[0-9+() -]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (customerName.length > 100 || chassisNumber.length > 60 || vehicleNumber.length > 30) return res.status(400).json({ error: 'One or more fields are too long.' });
    const doc = {
      customerName, phone, chassisNumber, vehicleNumber,
      numberPlateReceived: !!body.numberPlateReceived,
      rcReceivedByCustomer: !!body.rcReceivedByCustomer,
      notes: String(body.notes || '').trim().slice(0, 500),
      createdAt: new Date(), updatedAt: new Date()
    };
    const result = await customers.insertOne(doc);
    res.status(201).json({ ...doc, _id: String(result.insertedId) });
  } catch { res.status(500).json({ error: 'Could not save entry.' }); }
});
app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid entry ID.' });
    const body = req.body || {};
    const allowed = {};
    for (const key of ['customerName','phone','chassisNumber','vehicleNumber','notes']) {
      if (body[key] !== undefined) allowed[key] = String(body[key]).trim();
    }
    for (const key of ['numberPlateReceived','rcReceivedByCustomer']) {
      if (body[key] !== undefined) allowed[key] = !!body[key];
    }
    if (allowed.customerName !== undefined && !allowed.customerName) return res.status(400).json({ error: 'Customer name is required.' });
    if (allowed.phone !== undefined && !/^[0-9+() -]{7,20}$/.test(allowed.phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (allowed.vehicleNumber) allowed.vehicleNumber = allowed.vehicleNumber.toUpperCase();
    allowed.updatedAt = new Date();
    const result = await customers.updateOne({ _id: new ObjectId(req.params.id) }, { $set: allowed });
    if (!result.matchedCount) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Could not update entry.' }); }
});
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
connectDb().then(() => app.listen(PORT, () => console.log('KTL Daily Tasks listening on ' + PORT))).catch(err => { console.error('Database connection failed:', err.message); process.exit(1); });
