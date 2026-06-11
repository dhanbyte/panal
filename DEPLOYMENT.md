# 🚀 DEPLOYMENT GUIDE - Vercel & GitHub

## ✅ Pre-Deployment Checklist

### 1. Database Setup (Supabase)
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Navigate to **SQL Editor**
- Copy entire content from `supabase/migrations/final_schema.sql`
- Paste and **Run** the migration
- ✅ Database is ready!

### 2. GitHub Repository Setup

```bash
# Initialize Git (if not done)
cd c:\Users\dhana\Desktop\shopwaveteamsoftware
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Team Management App"

# Create new repo on GitHub: https://github.com/new
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 3. Vercel Deployment

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add Environment Variables (click "Environment Variables"):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
   NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
   IMAGEKIT_PRIVATE_KEY
   NEXT_PUBLIC_APP_URL
   ```
5. Click **Deploy**
6. ✅ Your app will be live in 2-3 minutes!

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, then deploy to production
vercel --prod
```

### 4. Update App URL
After deployment, update `NEXT_PUBLIC_APP_URL` in Vercel:
1. Go to Project Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` with your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Redeploy

## 📁 Project Structure

```
shopwaveteamsoftware/
├── app/              # Next.js pages
├── components/       # React components
├── lib/             # Utilities & Supabase config
├── supabase/        # Database migrations
├── .env.local       # Local environment (NOT committed)
├── .env.example     # Template for env vars
├── package.json     # Dependencies
└── vercel.json      # Vercel config
```

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` | ImageKit public key | ImageKit Dashboard |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint | ImageKit Dashboard |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key | ImageKit Dashboard |
| `NEXT_PUBLIC_APP_URL` | Your app URL | `http://localhost:3000` (dev) or Vercel URL (prod) |

## 🧪 Testing Locally

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

## 🎯 Quick Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check
```

## 🐛 Troubleshooting

### Build Fails on Vercel
- Check all environment variables are set
- Ensure Supabase database is running
- Check build logs in Vercel dashboard

### Database Connection Error
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure database migration ran successfully
- Check Supabase project is active

### ImageKit Upload Fails
- Verify all 3 ImageKit env variables
- Check ImageKit dashboard for API usage limits

## 🎉 Post-Deployment

1. Visit your Vercel URL
2. Register a new account
3. Create your first team
4. Start assigning tasks!

## 📞 Support

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [ImageKit Docs](https://docs.imagekit.io)

---

✨ **Your app is production-ready!**
