# Deployment Guide

## Vercel Deployment

This application is configured for deployment on Vercel. The backend is an Express.js server with a React frontend served statically.

### Required Environment Variables

Set these in your Vercel project settings before deploying:

```
# Required: Groq API for AI responses
GROQ_API_KEY=your_groq_api_key

# Required: Supabase database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional: Telegram notifications
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional: Server port (defaults to 3000)
PORT=3000
```

### Setup Instructions

1. **Create a Vercel account** and connect your GitHub repository
2. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all the keys above with their corresponding values
3. **Deploy:**
   - Push to your main branch, or manually trigger a deployment from Vercel dashboard
4. **Verify:**
   - Check logs: `https://vercel.com/[your-project]/logs`
   - Test homepage: `https://your-project.vercel.app`
   - Test routes: `/portfolio`, `/profile`, `/projects`, `/intro`

### Domain Redirect Rules

`vercel.json` includes host-based redirects so these domains always redirect to the portfolio page:

- `dineshwadhwani.online` → `https://www.thecoachdinesh.com/portfolio.html`
- `www.dineshwadhwani.online` → `https://www.thecoachdinesh.com/portfolio.html`

This redirect is applied before the catch-all route to `/api/index.js`.

### What Changed Since File-Based Storage

**Before:** Test results were stored in JSON files (`report-history.json`, `transformation-summary.json`)

**Now:** Test results are stored in Supabase PostgreSQL database

**Impact:**
- ✅ Serverless-compatible (no filesystem writes)
- ✅ Data persists across deployments
- ✅ Scalable to multiple instances
- ✅ Zero code changes to handlers (automatic fallback to files if Supabase not configured)

### Local Development

```bash
cd backend
npm install
npm start
```

Visit `http://localhost:3000`

### Troubleshooting

**"Could not find table 'public.report_history'"**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
- Check that tables exist in your Supabase project

**Falling back to file storage**
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` environment variables are set
- The system will automatically use file storage as fallback (but files don't persist on Vercel)

**Test results not saving**
- Ensure Telegram notifications don't block report saving (they run async)
- Check Supabase dashboard for any table errors

### Rollback to File Storage

If you need to roll back from Supabase:
1. Remove `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from environment variables
2. Redeploy
3. The system will automatically use JSON files (but won't work on serverless)

