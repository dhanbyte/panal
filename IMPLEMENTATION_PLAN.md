# Team Management & Task Tracking Application - Implementation Plan

## Project Overview
A Next.js + Supabase application for team management, task assignment, progress tracking, and performance analytics with real-time notifications.

## Tech Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Storage**: ImageKit (images), Supabase Storage (audio - 1 week retention)
- **Auth**: Supabase Auth (ID/Password)

## Database Schema

### Tables
1. **teams**
   - id (uuid, pk)
   - name (text)
   - owner_id (uuid, fk users)
   - created_at (timestamp)

2. **team_members**
   - id (uuid, pk)
   - team_id (uuid, fk teams)
   - user_id (uuid, fk users)
   - role (text: owner, manager, member)
   - join_date (timestamp)

3. **users**
   - id (uuid, pk)
   - email (text)
   - full_name (text)
   - password_hash (text)
   - avatar_url (text)
   - created_at (timestamp)

4. **departments** (Marketing, Orders, Development, Wholesale, SEO, Sales)
   - id (uuid, pk)
   - team_id (uuid, fk teams)
   - name (text)
   - created_at (timestamp)

5. **tasks**
   - id (uuid, pk)
   - title (text)
   - description (text)
   - department_id (uuid, fk departments)
   - assigned_to (uuid, fk users)
   - assigned_by (uuid, fk users)
   - status (text: pending, in_progress, completed, partially_completed)
   - progress_percentage (integer, 0-100)
   - due_date (timestamp)
   - created_at (timestamp)
   - completed_at (timestamp)
   - time_spent (integer, in seconds)

6. **task_comments**
   - id (uuid, pk)
   - task_id (uuid, fk tasks)
   - user_id (uuid, fk users)
   - comment (text)
   - created_at (timestamp)

7. **task_attachments**
   - id (uuid, pk)
   - task_id (uuid, fk tasks)
   - file_type (text: image, audio)
   - file_url (text)
   - file_name (text)
   - created_at (timestamp)

8. **user_scores**
   - id (uuid, pk)
   - user_id (uuid, fk users)
   - team_id (uuid, fk teams)
   - tasks_completed (integer)
   - avg_time (integer, in seconds)
   - total_time (integer, in seconds)
   - score (integer)
   - updated_at (timestamp)

## Features to Implement

### Phase 1: Authentication & Setup
- [x] User registration/login (Supabase Auth)
- [x] Team creation
- [x] Team member management
- [x] Department setup

### Phase 2: Task Management
- [x] Task creation with details
- [x] Task assignment to team members
- [x] Real-time timer on task start
- [x] Progress update (percentage + comments)
- [x] Task status tracking

### Phase 3: Attachments & Communication
- [x] Audio recording and upload to Supabase Storage
- [x] Image upload to ImageKit
- [x] Comment system on tasks
- [x] Task notifications

### Phase 4: Dashboard & Analytics
- [x] Team performance dashboard
- [x] Individual user scores
- [x] Task completion statistics
- [x] Leaderboard (tasks completed, time efficiency)

### Phase 5: UI/UX & Responsiveness
- [x] Mobile-first design
- [x] Bottom navbar for mobile (< 768px)
- [x] Top navbar for desktop (>= 768px)
- [x] Side navbar option for desktop with many buttons
- [x] Card-based task display
- [x] Real-time updates

## UI Components to Build

### Mobile (Bottom Navbar)
- Dashboard
- Tasks
- Teams
- Profile

### Desktop (Top Navbar + Side Navbar option)
- Logo + Company Name
- Dashboard Link
- Teams Management
- Tasks Overview
- Settings
- Profile

### Core Components
- TaskCard (with timer, progress, status)
- TeamCard (members, departments)
- ProgressBar (visual % completion)
- AudioRecorder (record & upload)
- CommentSection
- ScoreBoard (leaderboard)
- NotificationBell
- RealTimeTimer
- ProgressTracker

## API Endpoints (Backend Functions)

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout

### Teams
- GET /api/teams
- POST /api/teams
- GET /api/teams/:id
- PUT /api/teams/:id
- POST /api/teams/:id/members
- DELETE /api/teams/:id/members/:memberId

### Tasks
- GET /api/tasks
- POST /api/tasks
- PUT /api/tasks/:id
- PATCH /api/tasks/:id/progress
- POST /api/tasks/:id/comments
- POST /api/tasks/:id/attachments
- DELETE /api/tasks/:id

### Analytics
- GET /api/analytics/user-scores
- GET /api/analytics/team-stats
- GET /api/analytics/leaderboard

## File Structure
```
/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── teams/
│   │   └── profile/
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── TeamCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── AudioRecorder.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── public/
│   ├── .env.local
│   └── package.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── IMPLEMENTATION_PLAN.md
└── .env.example
```

## Progress Tracking
- [ ] Database schema created
- [ ] Frontend project initialized
- [ ] Authentication setup
- [ ] Task management features
- [ ] Audio recording integration
- [ ] Dashboard & analytics
- [ ] UI responsive design
- [ ] Deployment

## Timeline
- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 1-2 hours
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours
- Total: ~10-13 hours
