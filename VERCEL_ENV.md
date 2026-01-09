# Environment Variables for Vercel

## Required Variables

Copy these values to your Vercel project settings:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://unzfkcmmakyyjgruexpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM
```

### Backend API Configuration (Update after backend deployment)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend-url.onrender.com
```

### Optional
```
NEXT_PUBLIC_USE_DEV_AUTH=false
```

## How to Add in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Variable value
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Security Notes

- ✅ `NEXT_PUBLIC_*` variables are safe to expose (client-side)
- ⚠️ The Supabase anon key is designed to be public
- 🔒 Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
- 🔐 Backend API keys should remain server-side only

## Local Development

For local development, these are already in `packages/frontend/.env.local`

DO NOT commit `.env.local` to git!
