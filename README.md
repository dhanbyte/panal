# Team Management & Task Tracking Application

A modern team management and task tracking application built with **Next.js**, **React**, **Tailwind CSS**, and **Supabase**.

## Features

✅ **Team Management**
- Create and manage multiple teams
- Add team members with different roles (owner, manager, member)
- Organize teams by departments (Marketing, Orders, Development, Wholesale, SEO, Sales)

✅ **Task Management**
- Create and assign tasks to team members
- Real-time task timer
- Track task progress (0-100%)
- Support for multiple task statuses (pending, in_progress, completed, partially_completed)
- Task comments and notes
- Due date tracking

✅ **Attachments & Communication**
- Record and upload audio messages (stored for 1 week in Supabase)
- Image uploads via ImageKit
- Comment system for task collaboration

✅ **Performance Analytics**
- Individual and team performance dashboard
- Leaderboard showing top performers
- Task completion statistics
- Time efficiency metrics
- User scoring system

✅ **Responsive Design**
- Mobile-first approach
- Bottom navigation bar for mobile (< 768px)
- Top/side navigation bar for desktop (>= 768px)
- Card-based UI for better UX
- Real-time notifications

## Tech Stack

- **Frontend**: Next.js 14+, React 18+, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (Audio), ImageKit (Images)
- **UI Components**: Lucide Icons, React Hot Toast
- **State Management**: Zustand (optional)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project
- ImageKit account (for image uploads)

## Installation

### 1. Clone and Setup

```bash
cd frontend
npm install
```

### 2. Environment Variables

Create `.env.local` in the `frontend` directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Supabase Database

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Create a new query and copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── teams/
│   │   ├── analytics/
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TaskCard.tsx
│   │   └── ... (other components)
│   ├── lib/
│   │   └── supabase.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── next.config.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── IMPLEMENTATION_PLAN.md
└── README.md
```

## Key Pages

- **`/`** - Home/Dashboard (overview)
- **`/dashboard`** - Main dashboard with team overview
- **`/tasks`** - View and manage tasks
- **`/teams`** - Team management
- **`/analytics`** - Performance dashboard and leaderboard
- **`/settings`** - User settings
- **`/auth/login`** - Login page
- **`/auth/register`** - Registration page

## Database Schema

### Core Tables
- `users` - User profiles
- `teams` - Team data
- `team_members` - Team membership
- `departments` - Team departments
- `tasks` - Task data
- `task_comments` - Task comments
- `task_attachments` - Images and audio files
- `user_scores` - Performance metrics
- `notifications` - System notifications

## API Endpoints (Supabase RLS)

All data access is controlled via Supabase Row Level Security policies:

- Users can only see their own profile
- Team members can view their team data
- Tasks are visible to assigned user and team members
- Real-time subscriptions enabled for live updates

## Development Workflow

### Adding a New Feature

1. Create a new component in `components/`
2. Update relevant page in `app/`
3. Add necessary Supabase queries in `lib/`
4. Test on mobile and desktop views

### Testing

```bash
npm run type-check  # TypeScript checking
npm run build       # Build for production
```

### Production Build

```bash
npm run build
npm start
```

## Security

- All sensitive keys in environment variables
- Row Level Security enabled in Supabase
- Password hashing via Supabase Auth
- CSRF protection built-in
- Audio files auto-delete after 1 week

## Performance Optimizations

- Image optimization with Next.js Image
- Lazy loading for components
- Server-side rendering with ISR
- Efficient database queries with RLS
- Real-time subscriptions for live updates

## Troubleshooting

### Port Already in Use
```bash
# Change port in next.config.js or use:
npm run dev -- -p 3001
```

### Supabase Connection Error
- Verify credentials in `.env.local`
- Check Supabase project is active
- Ensure network connectivity

### Build Errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. Set up Supabase database with migrations
2. Configure environment variables
3. Run development server
4. Create your first team and invite members
5. Start creating tasks and assigning them

## Support

For issues or questions, check:
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## License

MIT License - Feel free to use for personal and commercial projects.
