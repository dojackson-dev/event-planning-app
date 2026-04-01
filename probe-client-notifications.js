const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);

const CLIENT_ID = 'd0a76998-fe21-4b4e-9cef-a12571999e24';

async function main() {
  // Get full invoice records
  const { data: fullInv, error: invErr } = await sb
    .from('invoices')
    .select('*')
    .eq('intake_form_id', CLIENT_ID);

  console.log('=== INVOICES ===');
  if (invErr) {
    console.log('Error:', invErr.message);
  } else if (!fullInv || fullInv.length === 0) {
    console.log('No invoices found');
  } else {
    fullInv.forEach(inv => {
      console.log('\n--- Invoice', inv.invoice_number || inv.id, '---');
      console.log('Status:', inv.status);
      console.log('Total:', inv.total_amount);
      console.log('Created:', inv.created_at);
      console.log('Sent at:', inv.sent_at !== undefined ? inv.sent_at : '(no sent_at column)');
      console.log('Paid at:', inv.paid_at || 'not paid');
      const notifKeys = Object.keys(inv).filter(k =>
        /sent|notif|email|sms|text|message/i.test(k)
      );
      if (notifKeys.length > 0) {
        console.log('Notification fields:', notifKeys.map(k => k + '=' + JSON.stringify(inv[k])).join(', '));
      }
    });
  }

  // Probe all possible notification/log tables
  console.log('\n=== PROBING LOG TABLES ===');
  const candidates = [
    'sms_logs', 'twilio_logs', 'message_logs', 'messages',
    'email_logs', 'outbound_messages', 'communication_logs',
    'sent_emails', 'sent_sms', 'notification_logs', 'audit_logs', 'activity_logs'
  ];
  for (const t of candidates) {
    const { data, error } = await sb.from(t).select('*').limit(5);
    if (!error) {
      console.log('TABLE EXISTS:', t, '| rows visible:', data.length);
      if (data.length > 0) console.log('  Sample keys:', Object.keys(data[0]).join(', '));
    }
  }
}

main().catch(err => console.error('Fatal:', err.message));

async function main() {
  console.log('=== Probing notifications for client:', CLIENT_ID, '===\n');

  // 1. Get the intake form record
  const { data: form, error: e1 } = await sb.from('intake_forms').select('*').eq('id', CLIENT_ID).single();
  if (e1) {
    console.log('intake_forms lookup error:', e1.message);
  } else {
    console.log('--- INTAKE FORM ---');
    console.log('Name:', form.name || form.client_name);
    console.log('Email:', form.email);
    console.log('Phone:', form.phone);
    console.log('Status:', form.status);
    console.log('Created:', form.created_at);
  }

  // 2. Invoices linked to this intake form
  const { data: invs, error: e2 } = await sb.from('invoices').select('*').eq('intake_form_id', CLIENT_ID);
  if (e2) {
    console.log('\ninvoices error:', e2.message);
  } else {
    console.log('\n--- INVOICES (' + (invs?.length || 0) + ') ---');
    if (invs && invs.length > 0) {
      invs.forEach(inv => {
        console.log('  Invoice', inv.invoice_number || inv.id, '| Status:', inv.status, '| Amount:', inv.total_amount, '| Created:', inv.created_at);
      });
    } else {
      console.log('  (none found)');
    }
  }

  // 3. notification_logs table
  const { data: nlogs, error: e3 } = await sb.from('notification_logs').select('*').eq('intake_form_id', CLIENT_ID);
  if (e3) {
    console.log('\nnotification_logs table:', e3.message);
  } else {
    console.log('\n--- NOTIFICATION LOGS (' + (nlogs?.length || 0) + ') ---');
    if (nlogs && nlogs.length > 0) {
      nlogs.forEach(l => console.log(' ', JSON.stringify(l)));
    } else {
      console.log('  (none found)');
    }
  }

  // 4. email_logs table
  const { data: elogs, error: e4 } = await sb.from('email_logs').select('*').eq('intake_form_id', CLIENT_ID);
  if (e4) {
    console.log('\nemail_logs table:', e4.message);
  } else {
    console.log('\n--- EMAIL LOGS (' + (elogs?.length || 0) + ') ---');
    if (elogs && elogs.length > 0) {
      elogs.forEach(l => console.log(' ', JSON.stringify(l)));
    } else {
      console.log('  (none found)');
    }
  }

  // 5. If we have the client email, search email_logs by email
  if (form && form.email) {
    const { data: ebyEmail, error: e5 } = await sb.from('email_logs').select('*').ilike('to', '%' + form.email + '%');
    if (!e5 && ebyEmail) {
      console.log('\n--- EMAIL LOGS BY ADDRESS (' + ebyEmail.length + ') ---');
      ebyEmail.forEach(l => console.log(' ', JSON.stringify(l)));
    }

    // 6. sms_logs by phone
    const { data: smsLogs, error: e6 } = await sb.from('sms_logs').select('*').ilike('to', '%' + (form.phone || '') + '%');
    if (e6) {
      console.log('\nsms_logs table:', e6.message);
    } else {
      console.log('\n--- SMS LOGS (' + (smsLogs?.length || 0) + ') ---');
      if (smsLogs && smsLogs.length > 0) {
        smsLogs.forEach(l => console.log(' ', JSON.stringify(l)));
      } else {
        console.log('  (none found)');
      }
    }
  }

  // 7. List all tables to see what notification-related tables exist
  const { data: tables, error: e7 } = await sb.rpc('get_tables_list');
  if (!e7 && tables) {
    const notifTables = tables.filter(t => /notif|email|sms|log|message|alert/i.test(t.table_name || t));
    if (notifTables.length > 0) {
      console.log('\n--- NOTIFICATION-RELATED TABLES ---');
      notifTables.forEach(t => console.log(' ', t.table_name || t));
    }
  }
}

main().catch(err => console.error('Fatal:', err.message));
