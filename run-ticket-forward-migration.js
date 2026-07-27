// Run ticket-forward-migration.sql against production Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'packages/backend/ticket-forward-migration.sql'),
    'utf8'
  )

  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    // exec_sql may not be available — fall back to reporting the SQL
    console.error('Migration via RPC failed:', error.message)
    console.log('\nRun this SQL manually in the Supabase SQL editor:')
    console.log('https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor\n')
    console.log(sql)
    return
  }

  console.log('✅ ticket_forward_codes table created successfully')
}

run()
