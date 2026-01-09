# 🚀 Quick Deploy to Vercel

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dojackson-dev/event-planning-app&root-directory=packages/frontend)

## Manual Deployment (5 minutes)

### 1. Push to GitHub ✅
```bash
git add .
git commit -m "prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

**Via Vercel Dashboard:**

1. Go to https://vercel.com/new
2. Import your repository
3. Configure:
   - **Root Directory**: `packages/frontend`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `npm run build`
   
4. Add Environment Variables (see VERCEL_ENV.md):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://unzfkcmmakyyjgruexpy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```

5. Click **Deploy** 🎉

### 3. Deploy Backend (Optional - Use Render)

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `packages/backend`
   - **Build**: `npm install && npm run build`
   - **Start**: `npm run start:prod`
   
5. Add all environment variables from `packages/backend/.env`

### 4. Update Supabase Auth URLs

In Supabase Dashboard:
- Site URL: `https://your-app.vercel.app`
- Add redirect URL: `https://your-app.vercel.app/**`

### 5. Update Backend CORS

In deployed backend, allow your Vercel domain in CORS settings.

## ✅ Verification Checklist

- [ ] Frontend deploys successfully on Vercel
- [ ] Backend deploys successfully on Render
- [ ] Environment variables are set
- [ ] Supabase auth works with new URL
- [ ] API calls work from frontend to backend
- [ ] All pages load correctly

## 📱 Your Live URLs

After deployment, you'll get:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

## 🐛 Troubleshooting

**Build fails?**
- Check Vercel build logs
- Verify all dependencies in package.json

**API not connecting?**
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check backend CORS settings
- Ensure backend is deployed and running

**Supabase auth fails?**
- Update Site URL in Supabase dashboard
- Add Vercel URL to redirect URLs

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete guide.

---

**Deployment time:** ~5 minutes  
**Cost:** $0 (Free tier)  
**Auto-deploy:** Yes (on every push to main)
