const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);
const CLIENT_ID = 'd0a76998-fe21-4b4e-9cef-a12571999e24';
const PHONE = '601918398';
const EMAIL = 'events@therookeryms.com';
(async () => {
  // Check messages table - look for this client
  const {data:msgs, error:me} = await sb.from('messages').select('*').or('recipient_phone.ilike.%601918398%,content.ilike.%events@therookeryms.com%,content.ilike.%INV-2026-0000%');
  if (me) console.log('messages error:', me.message);
  else { console.log('MESSAGES (' + msgs.length + '):'); msgs.forEach(m => console.log(JSON.stringify(m))); }
  
  // Also pull all messages
  const {data:allMsgs} = await sb.from('messages').select('*');
  console.log('\nALL MESSAGES (' + (allMsgs||[]).length + '):');
  (allMsgs||[]).forEach(m => console.log(JSON.stringify(m)));
})();
