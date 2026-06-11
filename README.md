# 🎯 ShopWave Team Management & Task Tracking App

A complete team management and task tracking application built with **Next.js 16**, **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## ✨ Features

- ✅ **Team Management** - Create teams, add members, assign roles
- ✅ **Task Tracking** - Create, assign, and track tasks with progress
- ✅ **Real-time Updates** - Live task updates using Supabase subscriptions
- ✅ **Analytics Dashboard** - Performance metrics and leaderboards
- ✅ **Audio & Image Attachments** - Record audio, upload images
- ✅ **Comments & Collaboration** - Task comments and notes
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Authentication** - Secure login/signup with Supabase Auth

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Setup Supabase Database
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Copy content from `supabase/migrations/final_schema.sql`
4. Run the migration

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📦 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage (Audio), ImageKit (Images)
- **UI**: Lucide Icons, React Hot Toast

## 📁 Project Structure

```
├── app/              # Next.js App Router pages
│   ├── auth/        # Login, Register, Forgot Password
│   ├── dashboard/   # Main dashboard
│   ├── tasks/       # Task management
│   ├── teams/       # Team management
│   ├── analytics/   # Performance analytics
│   └── settings/    # User settings
├── components/       # Reusable React components
├── lib/             # Utils, Supabase config, types
├── supabase/        # Database migrations
├── .env.example     # Environment variables template
├── .env.local       # Your local environment (not committed)
└── DEPLOYMENT.md    # Deployment guide
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub** (see [GITHUB_PUSH.md](GITHUB_PUSH.md))
2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Add environment variables
   - Click Deploy
3. **Done!** Your app is live 🚀

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key |
| `NEXT_PUBLIC_APP_URL` | Your app URL |

## 🎮 Key Pages

- `/` - Home page
- `/dashboard` - Main dashboard
- `/tasks` - Task management
- `/teams` - Team management
- `/analytics` - Performance analytics & leaderboard
- `/settings` - User settings
- `/auth/login` - Login
- `/auth/register` - Sign up

## 🗄️ Database Schema

- `users` - User profiles
- `teams` - Team data
- `team_members` - Team membership
- `departments` - Team departments (Marketing, Sales, etc.)
- `tasks` - Task data
- `task_assignees` - Task assignments
- `task_comments` - Task comments
- `task_attachments` - Images and audio files
- `notifications` - System notifications
- `user_scores` - Performance metrics

## 🧪 Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🛠️ Troubleshooting

### Port Already in Use
```bash
npm run dev -- -p 3001
```

### Database Connection Error
- Check Supabase credentials in `.env.local`
- Ensure database migration ran successfully
- Verify Supabase project is active

### Build Errors
```bash
rm -rf node_modules .next
npm install
npm run build
```

## 📝 License

MIT License - Free to use for personal and commercial projects.

## 🤝 Support

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)

---

**Built with ❤️ using Next.js, React, and Supabase**

🚀 **Ready for production deployment on Vercel!**