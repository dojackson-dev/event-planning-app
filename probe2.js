const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);
const CLIENT_ID = 'd0a76998-fe21-4b4e-9cef-a12571999e24';
(async () => {
  const {data:invs,error:ie} = await sb.from('invoices').select('*').eq('intake_form_id', CLIENT_ID);
  if (ie) { console.log('invoices error:', ie.message); }
  else {
    console.log('INVOICES:', invs.length);
    invs.forEach(inv => { console.log(JSON.stringify(inv)); });
  }
  const tables = ['sms_logs','twilio_logs','message_logs','messages','email_logs','outbound_messages','communication_logs','sent_emails','sent_sms','notification_logs','audit_logs','activity_logs'];
  for (const t of tables) {
    const {data,error} = await sb.from(t).select('*').limit(5);
    if (!error) console.log('TABLE_EXISTS: ' + t + ' rows=' + data.length + (data.length > 0 ? ' keys=' + Object.keys(data[0]).join(',') : ''));
  }
})();
