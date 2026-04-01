/**
 * send-invoices-now.js
 * Re-sends invoice notifications (SMS + email) for all draft invoices
 * tied to a specific client intake form that haven't been notified yet.
 *
 * Usage:  node send-invoices-now.js [intake_form_id]
 * If no ID provided, defaults to Dee Nixon's intake form.
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const https = require('https');

// -- Config -----------------------------------------------------------------
// Set these in your environment or in packages/backend/.env before running
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://unzfkcmmakyyjgruexpy.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM   = process.env.TWILIO_PHONE_NUMBER;
const FRONTEND_URL  = 'http://localhost:3000';

// SMTP � uses ethereal test account if real creds not set
const SMTP_HOST = 'smtp.ethereal.email';
const SMTP_PORT = 587;
const SMTP_USER = 'your_ethereal_user@ethereal.email';  // placeholder
const SMTP_PASS = 'your_ethereal_password';
const SMTP_FROM_ADDR = 'noreply@dovenue.com';

const CLIENT_ID = process.argv[2] || 'd0a76998-fe21-4b4e-9cef-a12571999e24';
// ---------------------------------------------------------------------------

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Send SMS via Twilio REST API (no extra npm needed beyond https)
function sendSMS(to, body) {
  return new Promise((resolve, reject) => {
    // Ensure E.164 format
    const phone = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '');
    const postData = new URLSearchParams({ To: phone, From: TWILIO_FROM, Body: body }).toString();
    const opts = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (res.statusCode >= 300) reject(new Error(parsed.message || JSON.stringify(parsed)));
        else resolve(parsed);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendEmail(transporter, toEmail, clientName, inv, invoiceUrl) {
  const amt = '$' + Number(inv.total_amount).toFixed(2);
  const due = new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const info = await transporter.sendMail({
    from: `"DoVenue Suites" <${SMTP_FROM_ADDR}>`,
    to: toEmail,
    subject: `Invoice ${inv.invoice_number} is Ready � View & Pay Online`,
    text: `Hi ${clientName},\n\nYour invoice ${inv.invoice_number} for ${amt} is ready.\nDue: ${due}\n\nView and pay here: ${invoiceUrl}\n\nDoVenue Suites`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px;text-align:center">
          <h1 style="color:white;margin:0">DoVenue Suites</h1>
          <p style="color:rgba(255,255,255,.85);margin:8px 0 0">Invoice Ready</p>
        </div>
        <div style="padding:32px;background:#fff">
          <p>Hi <strong>${clientName}</strong>,</p>
          <p>Your invoice is ready. Please review and pay at your earliest convenience.</p>
          <div style="background:#f0f4ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;width:130px">Invoice #</td><td style="font-weight:600">${inv.invoice_number}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Amount Due</td><td style="font-weight:700;font-size:18px;color:#2563eb">${amt}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Due Date</td><td style="font-weight:600">${due}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin:32px 0">
            <a href="${invoiceUrl}" style="background:#2563eb;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">View &amp; Pay Invoice</a>
          </div>
        </div>
      </div>`,
  });
  return nodemailer.getTestMessageUrl(info) || info.messageId;
}

async function main() {
  console.log('\n?? Fetching client and invoices...\n');

  // Get intake form
  const { data: form, error: fe } = await sb.from('intake_forms').select('*').eq('id', CLIENT_ID).single();
  if (fe || !form) { console.error('Could not find intake form:', fe?.message); process.exit(1); }
  const clientName  = form.contact_name  || 'Valued Client';
  const clientPhone = form.contact_phone || null;
  const clientEmail = form.contact_email || null;

  console.log(`Client:  ${clientName}`);
  console.log(`Email:   ${clientEmail || '(none)'}`);
  console.log(`Phone:   ${clientPhone || '(none)'}`);

  // Get invoices
  const { data: invoices, error: ie } = await sb.from('invoices').select('*').eq('intake_form_id', CLIENT_ID);
  if (ie || !invoices?.length) { console.error('No invoices found:', ie?.message); process.exit(1); }
  console.log(`Invoices found: ${invoices.length}\n`);

  // Build email transporter
  let transporter;
  const smtpIsPlaceholder = SMTP_USER.includes('your_') || SMTP_PASS.includes('your_');
  if (smtpIsPlaceholder) {
    console.log('??  SMTP credentials are placeholder � creating Ethereal test account for email preview...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`   Ethereal test account: ${testAccount.user}\n`);
  } else {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT), secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  // Process each invoice
  for (const inv of invoices) {
    const invoiceUrl = `${FRONTEND_URL}/client-portal/invoices/${inv.id}`;
    console.log(`\n-- Invoice ${inv.invoice_number} ($${inv.total_amount}) --`);
    console.log(`   URL: ${invoiceUrl}`);

    // SMS
    if (clientPhone) {
      try {
        const result = await sendSMS(clientPhone, `Hi ${clientName}, your invoice ${inv.invoice_number} for $${Number(inv.total_amount).toFixed(2)} is ready. View & pay here: ${invoiceUrl}`);
        console.log(`   ? SMS sent � SID: ${result.sid}`);
      } catch (err) {
        console.error(`   ? SMS failed: ${err.message}`);
      }
    } else {
      console.log('   ??  SMS skipped � no phone number');
    }

    // Email
    if (clientEmail) {
      try {
        const result = await sendEmail(transporter, clientEmail, clientName, inv, invoiceUrl);
        if (result && result.startsWith('https://')) {
          console.log(`   ? Email sent (Ethereal preview � not delivered to ${clientEmail}):`);
          console.log(`      ${result}`);
        } else {
          console.log(`   ? Email sent to ${clientEmail} � Message ID: ${result}`);
        }
      } catch (err) {
        console.error(`   ? Email failed: ${err.message}`);
      }
    } else {
      console.log('   ??  Email skipped � no email address');
    }
  }

  console.log('\n? Done.\n');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
