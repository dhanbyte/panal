# Quick Start Guide

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
cd c:\Users\dhana\Desktop\shopwaveteamsoftware\frontend
npm install
```

### Step 2: Supabase Setup

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use existing
3. Go to Settings → API Keys
4. Copy the project URL and anon key
5. Update `.env.local` with your credentials

### Step 3: Run Database Migrations

1. In Supabase, go to SQL Editor
2. Create new query
3. Paste contents of `supabase/migrations/001_initial_schema.sql`
4. Execute

### Step 4: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser

### Step 5: Create First Account

1. Click "Sign up here"
2. Register with email and password
3. You'll be logged in automatically
4. Create your first team from dashboard

## 📱 Features to Explore

- ✅ Team Management - Create and manage teams
- ✅ Task Assignment - Assign tasks with timers
- ✅ Progress Tracking - Update task progress
- ✅ Analytics Dashboard - View team performance
- ✅ Responsive UI - Works on mobile and desktop

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run linter |
| `npm run type-check` | Check TypeScript types |

## 📁 Important Files

- `.env.local` - Environment variables (your credentials)
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `IMPLEMENTATION_PLAN.md` - Full feature list
- `README.md` - Complete documentation

## 🎯 Next Features to Build

1. Audio Recording Upload
2. Image Upload to ImageKit
3. Task Notifications
4. Performance Leaderboard
5. Advanced Analytics
6. Team Invitations

## 🚨 Common Issues

### Port Already in Use?
```bash
npm run dev -- -p 3001
```

### Dependencies Not Installing?
```bash
npm install --force
```

### Supabase Connection Error?
- Check `.env.local` credentials
- Verify Supabase project is active
- Check network connectivity

## 📞 Support

Check logs in browser console (F12) for errors.
All API calls use Supabase - check database directly for issues.

---

**Happy Coding! 🎉**
