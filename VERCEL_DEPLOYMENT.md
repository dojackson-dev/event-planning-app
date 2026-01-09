# Vercel Deployment Guide

## 🚀 Deploy to Vercel

This guide will help you deploy the Event Planning App frontend to Vercel.

### Prerequisites

1. GitHub account with the repository
2. Vercel account (free tier works)
3. Supabase project (already configured)

### Deployment Steps

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Import Project**: Click "Add New" → "Project"
3. **Import Git Repository**: 
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave as default (`.next`)
   - **Install Command**: `npm install`

5. **Environment Variables**: Add these in Vercel dashboard
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://unzfkcmmakyyjgruexpy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
   ```

6. **Deploy**: Click "Deploy"

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project root
cd event-planning-app

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Confirm root directory: packages/frontend
```

### Backend Deployment Options

Since the backend is NestJS, you have several options:

#### Option A: Deploy Backend to Render/Railway/Fly.io

1. **Render.com** (Recommended):
   - Create new Web Service
   - Connect GitHub repo
   - Set root directory: `packages/backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:prod`
   - Add environment variables from `.env`

2. **Railway.app**:
   - Similar process to Render
   - Automatic deployment from GitHub
   - Add environment variables

3. **Fly.io**:
   - More control, requires Dockerfile
   - Good for production

#### Option B: Convert Backend to Vercel Serverless Functions

This requires restructuring the NestJS backend to serverless functions. Not recommended unless necessary.

### Post-Deployment Configuration

#### 1. Update Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

Add your Vercel domain:
```
Site URL: https://your-app.vercel.app
Redirect URLs: 
  - https://your-app.vercel.app/**
  - http://localhost:3000/**
```

#### 2. Update CORS in Backend

Update `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',
    'https://*.vercel.app' // For preview deployments
  ],
  credentials: true,
});
```

#### 3. Update Environment Variables

Once backend is deployed, update Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Commits to `main` branch → `your-app.vercel.app`
- **Preview**: Pull requests → unique preview URLs

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Supabase redirect URLs with new domain

### Environment Variables Security

⚠️ **Never commit these files:**
- `.env.local` (already in .gitignore)
- `.env` (already in .gitignore)

✅ **Safe to commit:**
- `.env.local.example` (template without real values)
- `vercel.json` (configuration only)

### Troubleshooting

#### Build Fails

**Issue**: "Module not found"
- **Solution**: Ensure `package.json` has all dependencies
- Run `npm install` locally to verify

**Issue**: "Build exceeded time limit"
- **Solution**: Optimize build, remove unused dependencies

#### App Doesn't Load

**Issue**: Blank page or 500 error
- **Solution**: Check Vercel deployment logs
- Verify environment variables are set correctly

#### API Connection Fails

**Issue**: "Network error" or CORS errors
- **Solution**: 
  - Check `NEXT_PUBLIC_API_URL` is correct
  - Verify backend CORS allows your Vercel domain
  - Check backend is deployed and running

### Monitoring

Vercel provides:
- **Analytics**: Traffic and performance
- **Logs**: Runtime and build logs
- **Speed Insights**: Core Web Vitals

Access via: Project → Analytics/Logs tabs

### Cost

**Vercel Free Tier includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Preview deployments
- Automatic HTTPS
- Custom domains

**Backend hosting** (Render Free Tier):
- 750 hours/month
- Sleeps after 15 min inactivity
- Auto-wakes on request

### Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Render/Railway
3. ✅ Update environment variables
4. ✅ Configure Supabase redirects
5. ✅ Update backend CORS
6. ✅ Test all features in production
7. 🎉 Share your live app!

### Useful Commands

```bash
# Check build locally
cd packages/frontend
npm run build
npm run start

# View deployment logs
vercel logs

# Rollback to previous deployment
vercel rollback

# List all deployments
vercel ls
```

### Resources

- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Render Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Supabase Auth with Vercel](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Need Help?** Check the deployment logs in Vercel dashboard for specific error messages.
