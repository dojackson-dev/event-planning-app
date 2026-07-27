#!/usr/bin/env node
/**
 * Fix user_role enum to include 'promoter' value
 * 
 * This script attempts to add 'promoter' to the user_role enum in Supabase.
 * If it fails due to lack of direct SQL RPC support, it will provide manual instructions.
 */

const https = require('https');

async function makeSupabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'unzfkcmmakyyjgruexpy.supabase.co',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.t_uLJfh0hg3dKt1Vz9x5qK-l2m8n9o0pQ1r2s3t4u5v',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.t_uLJfh0hg3dKt1Vz9x5qK-l2m8n9o0pQ1r2s3t4u5v'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fixEnum() {
  console.log('🚀 Attempting to add "promoter" to user_role enum...\n');

  try {
    // The Supabase API doesn't directly support raw SQL execution without an RPC function
    // So we provide manual instructions
    console.log('⚠️  Direct SQL execution requires Supabase SQL Editor\n');
    console.log('📖 MANUAL FIX REQUIRED:\n');
    console.log('1. Go to: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new');
    console.log('2. Copy and paste this SQL:\n');
    console.log('   ┌────────────────────────────────────────────────────────────┐');
    console.log('   │ ALTER TYPE user_role ADD VALUE \'promoter\';                │');
    console.log('   └────────────────────────────────────────────────────────────┘\n');
    console.log('3. Click "RUN"\n');
    console.log('4. ✅ Done! You can now create promoter accounts.\n');

    console.log('💡 Or paste this if the above doesn\'t work (handles existing):');
    console.log('   ┌────────────────────────────────────────────────────────────────┐');
    console.log('   │ DO $$                                                          │');
    console.log('   │ BEGIN                                                          │');
    console.log('   │   IF NOT EXISTS (                                              │');
    console.log('   │     SELECT 1 FROM pg_type WHERE typname = \'user_role\'        │');
    console.log('   │     AND EXISTS (                                               │');
    console.log('   │       SELECT 1 FROM pg_enum                                    │');
    console.log('   │       JOIN pg_type ON pg_enum.enumtypid = pg_type.oid         │');
    console.log('   │       WHERE pg_type.typname = \'user_role\'                   │');
    console.log('   │       AND pg_enum.enumlabel = \'promoter\'                    │');
    console.log('   │     )                                                          │');
    console.log('   │   ) THEN                                                       │');
    console.log('   │     ALTER TYPE user_role ADD VALUE \'promoter\';               │');
    console.log('   │   END IF;                                                      │');
    console.log('   │ END $$;                                                        │');
    console.log('   └────────────────────────────────────────────────────────────────┘\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixEnum();
