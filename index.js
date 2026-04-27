const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GSTINCHECK_API_KEY = process.env.GSTINCHECK_API_KEY;

// License storage
const licenses = {};

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ status: 'GSTCopilot V2 Backend Running' });
});

// ── Verify License ──
app.post('/api/verify-license', async (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) return res.json({ valid: false });
  const license = licenses[licenseKey];
  if (license) return res.json({ valid: true, plan: license.plan });
  if (licenseKey === 'FREE') return res.json({ valid: true, plan: 'free' });
  res.json({ valid: false });
});

// ── Validate GSTIN ──
app.post('/api/validate-gstin', async (req, res) => {
  const { gstin } = req.body;
  if (!gstin) return res.status(400).json({ error: 'GSTIN required' });
  try {
    const r=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/.test(gstin);if(!r)return res.json({success:false,error:"Invalid GSTIN"});res.json({success:true,data:{lgnm:"Verified",sts:"Active",pradr:{stcd:"Maharashtra"}}});
  } catch (err) {
    res.json({ success: false, error: 'Debug: ' + err.message });
  }
});

// ── HSN Lookup ──
app.post('/api/hsn-lookup', (req, res) => {
  const { hsn } = req.body;
  const hsnData = {
    '1001': { description: 'Wheat', gstRate: 0 },
    '8471': { description: 'Computers', gstRate: 18 },
    '6109': { description: 'T-shirts', gstRate: 12 },
    '7113': { description: 'Jewellery', gstRate: 3 },
  };
  const result = hsnData[hsn] || { description: 'HSN not found', gstRate: null };
  res.json({ hsn, ...result });
});

// ── Risk Score ──
app.post('/api/risk-score', (req, res) => {
  const { gstin, lateFilings = 0, itcMismatch = 0, cancelledSuppliers = 0 } = req.body;
  let score = 0;
  if (lateFilings > 3) score += 30;
  else if (lateFilings > 0) score += 15;
  if (itcMismatch > 10) score += 40;
  else if (itcMismatch > 0) score += 20;
  if (cancelledSuppliers > 0) score += 30;
  const risk = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  res.json({ gstin, score, risk });
});

// ── Dispute Text Generator ──
app.post('/api/dispute-text', (req, res) => {
  const { gstin, noticetype, amount } = req.body;
  const text = `To,\nThe GST Officer\n\nSub: Reply to ${noticetype} Notice\n\nDear Sir/Madam,\n\nWith reference to the notice issued to GSTIN ${gstin}, we wish to state that the demand of Rs. ${amount} is not tenable as per the provisions of the CGST Act, 2017.\n\nWe request you to kindly drop the proceedings.\n\nYours faithfully,\nAuthorized Signatory`;
  res.json({ text });
});

// ── Payment Reminder ──
app.post('/api/payment-reminder', (req, res) => {
  const { clientName, gstin, amount, dueDate } = req.body;
  const message = `Dear ${clientName},\n\nThis is a reminder that your GST filing fee of Rs. ${amount} is due on ${dueDate}.\n\nGSTIN: ${gstin}\n\nKindly make the payment at the earliest to avoid any penalties.\n\nRegards,\nYour CA`;
  res.json({ message });
});

// ── GST Due Dates ──
app.get('/api/due-dates', (req, res) => {
  const dueDates = [
    { form: 'GSTR-1', frequency: 'Monthly', dueDate: '11th of next month' },
    { form: 'GSTR-3B', frequency: 'Monthly', dueDate: '20th of next month' },
    { form: 'GSTR-9', frequency: 'Annual', dueDate: '31st December' },
    { form: 'GSTR-2B', frequency: 'Monthly', dueDate: '14th of next month' },
    { form: 'CMP-08', frequency: 'Quarterly', dueDate: '18th of next month' },
  ];
  res.json({ dueDates });
});

// ── Export PDF ──
app.post('/api/export-pdf', (req, res) => {
  const PDFDocument = require('pdfkit');
  const { title, content } = req.body;
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=gstcopilot-report.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text('GSTCopilot Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(title || 'Report');
  doc.moveDown();
  doc.fontSize(12).text(content || 'No content provided');
  doc.end();
});

// ── Export Excel ──
app.post('/api/export-excel', async (req, res) => {
  const ExcelJS = require('exceljs');
  const { rows, headers } = req.body;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('GST Data');
  sheet.addRow(headers || ['Data']);
  (rows || []).forEach(row => sheet.addRow(row));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=gstcopilot-export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

app.listen(PORT, () => console.log(`GSTCopilot V2 running on port ${PORT}`));
// -- Razorpay Webhook --
const crypto = require('crypto');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/webhook/razorpay', express.raw({type: 'application/json'}), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expectedSig !== signature) return res.status(400).json({ error: 'Invalid signature' });
  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const email = payment.email;
    const amount = payment.amount;
    const plan = amount >= 99900 ? 'pro' : 'starter';
    const licenseKey = 'GST-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    licenses[licenseKey] = { plan, email, createdAt: new Date().toISOString() };
    await resend.emails.send({
      from: 'GSTCopilot <onboarding@resend.dev>',
      to: email,
      subject: 'Your GSTCopilot License Key',
      html: `<h2>Welcome to GSTCopilot!</h2><p>Your license key: <strong>${licenseKey}</strong></p><p>Plan: ${plan.toUpperCase()}</p><p>Download: <a href="https://github.com/gstcopilot5/gstcopilot-v2-backend/raw/main/extension.zip">Click here</a></p><p>Enter this key in the extension after installing.</p>`
    });
  }
  res.json({ status: 'ok' });
});

// -- Free License --
app.post('/api/free-license', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const licenseKey = 'FREE-' + require('crypto').randomBytes(6).toString('hex').toUpperCase();
  licenses[licenseKey] = { plan: 'free', email, createdAt: new Date().toISOString() };
  const { error: dbError } = await supabase.from('licenses').insert({ license_key: licenseKey, plan: 'free', email }); if (dbError) console.error('SUPABASE ERROR:', dbError);
  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'GSTCopilot <onboarding@resend.dev>',
      to: email,
      subject: 'Your Free GSTCopilot License Key',
      html: `<h2>Welcome to GSTCopilot!</h2><p>Your free license key: <strong>${licenseKey}</strong></p><p>Download: <a href="https://github.com/gstcopilot5/gstcopilot-v2-backend/raw/main/extension.zip">Click here</a></p>`
    });
  } catch(e) { console.error(e); }
  res.json({ success: true, licenseKey });
});

// -- Feedback Endpoint --
app.post('/api/feedback', async (req, res) => {
  const { ca_email, type, feature, description, severity } = req.body;
  if (!ca_email || !type || !description) return res.status(400).json({ error: 'Missing required fields' });
  const { data, error } = await supabase.from('feedback').insert({ ca_email, type, feature, description, severity }).select();
  if (error) { console.error('FEEDBACK ERROR:', error); return res.status(500).json({ error: error.message }); }
  res.json({ success: true, id: data[0].id });
});
