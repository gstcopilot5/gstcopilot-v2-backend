const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

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
app.post('/api/verify-license', (req, res) => {
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
    const response = await axios.get(
      `https://api.gstzen.in/taxpayers/${gstin}`,
      { headers: { 'x-api-key': GSTINCHECK_API_KEY } }
    );
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: 'Invalid GSTIN or API error' });
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