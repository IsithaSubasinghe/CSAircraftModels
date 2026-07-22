require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
 
const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
 
const EMAIL_FROM = process.env.EMAIL_FROM || 'CS Aircraft Models <no-reply@csaircraftmodels.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
 
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
 
// Store uploads in memory only — never touch disk (required for Vercel's read-only filesystem)
const upload = multer({ storage: multer.memoryStorage() });
 
app.use(express.static(PUBLIC_DIR));
 
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});
 
app.post('/api/orders', upload.single('image'), async (req, res) => {
  const { name, email, country, whatsapp, model, custom, size } = req.body;
 
  if (!name || !email || !country || !whatsapp || !model) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }
 
  const order = {
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    country: country.trim(),
    whatsapp: whatsapp.trim(),
    model: model.trim(),
    custom: custom?.trim() || '',
    size: size?.trim() || ''
  };
 
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !ADMIN_EMAIL) {
    console.log('SMTP not configured, skipping email notification');
    return res.json({ success: true, note: 'Order received but email not configured' });
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
        content: req.file.buffer // in-memory buffer, no disk involved
      }
    ] : []
  };
 
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to', ADMIN_EMAIL);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to send order email:', error.message);
    return res.status(500).json({ error: 'Order could not be emailed. Please try again later.' });
  }
});
 
app.use((req, res) => {
  res.status(404).send('Not Found');
});
 
app.listen(PORT, () => {
  console.log(`CSair backend running at http://localhost:${PORT}`);
});

app.listen(PORT, () => {
  console.log(`CSair backend running at http://localhost:${PORT}`);
});
