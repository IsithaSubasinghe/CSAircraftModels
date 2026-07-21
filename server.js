require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'backend-data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DB_FILE = path.join(DATA_DIR, 'orders.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

const EMAIL_FROM = process.env.EMAIL_FROM || 'CS Aircraft Models <no-reply@csaircraftmodels.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !ADMIN_EMAIL) {
  console.warn('Warning: SMTP configuration is incomplete. Order emails will not be sent until .env is configured.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASSWORD ? {
    user: SMTP_USER,
    pass: SMTP_PASSWORD
  } : undefined
});

// Removed transporter.verify to prevent startup errors

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');
}

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      model TEXT NOT NULL,
      custom TEXT,
      size TEXT,
      imagePath TEXT,
      status TEXT NOT NULL
    )
  `);
});

function runDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({ storage });

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/backend-data', express.static(DATA_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

function basicAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const encoded = authHeader.split(' ')[1] || '';

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');

  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
  return res.status(401).send('Authentication required.');
}

app.get(['/admin', '/admin.html'], basicAdminAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/api/admin/orders', basicAdminAuth, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Failed to read orders from database:', err.message);
      return res.status(500).json({ error: 'Failed to read stored orders.' });
    }
    return res.json(rows);
  });
});

app.post('/api/orders', upload.single('image'), async (req, res) => {
  const { name, email, country, whatsapp, model, custom, size } = req.body;

  if (!name || !email || !country || !whatsapp || !model) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  const order = {
    id: orders.length + 1,
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    country: country.trim(),
    whatsapp: whatsapp.trim(),
    model: model.trim(),
    custom: custom?.trim() || '',
    size: size?.trim() || '',
    imagePath: req.file ? path.relative(__dirname, req.file.path) : null,
    status: 'received'
  };

  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');

  try {
    const dbResult = await runDb(
      `INSERT INTO orders (createdAt, name, email, country, whatsapp, model, custom, size, imagePath, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.createdAt,
        order.name,
        order.email,
        order.country,
        order.whatsapp,
        order.model,
        order.custom,
        order.size,
        order.imagePath,
        order.status
      ]
    );

    order.dbId = dbResult.lastID;
    console.log('Order saved to database with id', order.dbId);
  } catch (dbError) {
    console.error('Failed to save order to database:', dbError.message);
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !ADMIN_EMAIL) {
    console.log('SMTP not configured, skipping email notification');
    return res.json({ success: true, orderId: order.id, dbId: order.dbId || null });
  }

  const mailBody = [
    `New custom model request from ${order.name}`,
    '',
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    `Country: ${order.country}`,
    `WhatsApp: ${order.whatsapp}`,
    `Model request: ${order.model}`,
    `Preferred size/scale: ${order.size || 'Not specified'}`,
    `Custom requests: ${order.custom || 'None'}`,
    `Received at: ${order.createdAt}`
  ].join('\n');

  const mailOptions = {
    from: EMAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `New Model Request — ${order.name}`,
    text: mailBody,
    attachments: req.file ? [
      {
        filename: req.file.originalname,
        path: req.file.path
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to', ADMIN_EMAIL);
    return res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Failed to send order email:', error.message);
    console.error('SMTP config:', { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASSWORD ? '***' : 'not set' });
    // Still return success since order is saved
    return res.json({ success: true, orderId: order.id, note: 'Order saved but email failed' });
  }
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`CSair backend running at http://localhost:${PORT}`);
});
