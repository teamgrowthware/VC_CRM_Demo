# Vortex Cubes CRM - Demo

Self-contained demo for **Vortex Cubes CRM & HRMS**, ready to deploy to Vercel (or Render/DigitalOcean). The demo database is pre-seeded with data in every section, and the included backend is wired to it.

## What's inside

```
vortex_cubes_demo/
├── (root)          # Demo frontend (Next.js)
│   ├── src/app/    # Landing + login with demo credentials + "Try Demo" button
│   └── .env.local  # NEXT_PUBLIC_API_URL -> change to your deployed backend URL
└── backend/        # Demo backend (Express + Prisma + Socket.io)
    ├── src/        # Full backend API (all sections)
    ├── api/        # Vercel serverless entry point (api/index.ts)
    ├── prisma/     # Schema
    └── .env        # Points ALL DB connections to the pre-seeded demo database
```

## Demo Credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin (Super Admin) | `demo.admin@vortexcubes.com` | `password123` |
| HR Manager | `demo.hr@vortexcubes.com` | `password123` |
| Project Manager | `demo.pm@vortexcubes.com` | `password123` |
| Developer | `demo.dev1@vortexcubes.com` | `password123` |
| Designer | `demo.design@vortexcubes.com` | `password123` |

All demo accounts share the same password: **`password123`**

## Sections with pre-seeded demo data

Employees, departments, projects, sprints, tasks, subtasks, comments, documents, attendance (7 days), leaves, holidays, leads, expenses, penalties, meetings, events, announcements, revenue, portfolio projects, project finance (milestones / payments / invoices), time entries, active timer, payroll, salary addons/deductions, payslips, petty cash, daily reports (SOD/EOD), performance reviews, chat rooms + messages, notifications, activity logs, system settings.

## Deploy

### 1. Backend

Deploy the `backend/` folder to a host that runs a persistent Node server:

- **Recommended (persistent host)**: Render or DigitalOcean (Dockerfile included). Socket.io real-time chat, attendance tracking and the "Reset Data" button all work here.
- **Vercel (optional)**: create a project rooted at `backend/`. The Express app deploys as a serverless function via `api/index.ts`. Note: real-time socket.io, cron jobs and the in-place demo reset script do **not** run on serverless.

No extra environment variables are needed — the included `.env` already points all database traffic to the pre-seeded demo database.

> The backend auto-creates `admin@vortexcubes.com / Admin@123` on boot (default app behavior).

### 2. Frontend

1. Create a Vercel project rooted at this folder (the demo frontend). Framework: **Next.js** (auto-detected).
2. Set the environment variable to your deployed backend's `/api`:

   ```
   NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL/api
   ```

3. Deploy.

## One-Click Demo

The landing page has a **Try Demo** button (`POST /api/demo/login`) that logs straight into the demo admin dashboard. The "Reset Data" button restores pristine demo data (works on persistent hosts).

## Local Development

```bash
# Backend (from the backend/ folder)
npm install
npm run dev          # http://localhost:5000

# Frontend (from this folder)
npm install
npm run dev          # http://localhost:3000
```

The default `.env.local` points to the existing DigitalOcean backend so the frontend runs out of the box; switch `NEXT_PUBLIC_API_URL` to `http://localhost:5000/api` to use the included backend locally.
