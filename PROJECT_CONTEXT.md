# The Coach Dinesh - Project Context

## Project Overview

**The Coach Dinesh** is a comprehensive executive coaching platform with AI-powered tools, visitor analytics, bot interactions logging, and multiple complementary products. It helps leaders unlock their potential through assessments, coaching programs, and strategic guidance.

**Website:** https://www.thecoachdinesh.com

## What The Project Does

### Core Functions:
1. **Leadership Coaching Portal** - Displays coaching services, journey, approach, and contact information
2. **Interactive Assessment Tools** - Personality/leadership quizzes and games (Leadership Reflection, Clarity Challenge, Presence, Systems Thinking)
3. **AI Chatbot** - Coach Dinesh bot for real-time conversations with visitors, logs all interactions to database
4. **Visitor Analytics Dashboard** - Tracks site visitors with geolocation, device info, browser/OS detection
5. **Admin Dashboard** - Centralized hub for managing reports, visitor logs, and bot interactions
6. **Courses Platform** - Landing page and AI & LLM engineering course content
7. **Report Management** - Stores assessment results in Supabase PostgreSQL

### Complementary Products:
- **Coaching Studio** (www.coachingstudio.in) - Assessment tools, leadership programs, global events
- **Search My Job** (www.searchmyjob.online) - AI job matching with resume optimization
- **Dinesh Trade** (www.dineshtrade.online) - Algorithmic trading with agents
- **AI & LLM Engineering Course** - Visiting faculty content for colleges

---

## Page Structure

### Frontend Pages (`/frontend`)

| Page | Route | Purpose | Auth Required |
|------|-------|---------|---|
| **index.html** | `/` | Landing page with hero, journey, approach, coaching services, projects section | No |
| **projects.html** | `/projects` | Portfolio of technical projects | No |
| **portfolio.html** | `/portfolio` | Professional background and experience | No |
| **profile.html** | `/profile` | Detailed bio and coaching expertise | No |
| **visitorlog.html** | `/visitorlog` | Admin visitor analytics dashboard | Yes |
| **botlog.html** | `/botlog` | Admin bot interactions log with accordion UI | Yes |
| **admin-dashboard.html** | `/admin` (when auth) | Hub for admin features with 3 main links | Yes |
| **admin-reports.html** | `/admin-reports` | Manage leadership assessment reports | Yes |

### Course Pages (`/courses`)

| Page | Route | Purpose |
|------|-------|---------|
| **courses/index.html** | `/courses` | Courses landing page with 4 course tiles |
| **courses/ai/index.html** | `/courses/ai` | AI & LLM Engineering course hero page |
| **courses/ai/about.html** | `/courses/ai/about` | Instructor bio and course introduction |
| **courses/ai/curriculum.html** | `/courses/ai/curriculum` | 12-session course breakdown |
| **courses/ai/lab-tests.html** | `/courses/ai/lab-tests` | Hands-on lab projects and assessments |
| **courses/ai/sessions/** | `/courses/ai/sessions/session-X` | Individual session content pages |

---

## Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript** (vanilla - no framework)
- **Fonts:** Playfair Display (serif headings), Inter (body text)
- **Responsive Design:** Mobile-first, flexbox/grid layouts

### Backend
- **Runtime:** Node.js (Express.js v5)
- **Deployment:** Vercel (serverless functions)
- **Entry Point:** `/api/index.js` (exports Express app)

### Database
- **Supabase PostgreSQL** for:
  - `report_history` - Leadership assessment results
  - `visitor_logs` - Site visitor tracking with geolocation
  - `bot_logs` - Chatbot conversation history
  - `transformation_summary` - Transformation tracking data
- **Row Level Security (RLS):** ENABLED (service role only access)

### APIs & Services
- **Groq API** - AI model for chatbot responses
- **Telegram** - Notifications for new coaching leads
- **ip-api.io / ipinfo.io** - IP geolocation (with 24-hour cache)
- **User-Agent parsing** - Browser, OS, device type detection

### Authentication
- **Admin Login:** Password = current date in `ddmmyyyy` format (e.g., 15072026)
- **Session Storage:** HTTP-only cookies with SameSite=Strict
- **Cookie Name:** `adminAuth`

---

## Project Structure

```
thecoachdinesh/
├── api/
│   └── index.js                    # Vercel serverless entry point
├── backend/
│   ├── app.js                      # Main Express application
│   ├── package.json                # Node dependencies
│   ├── .env                        # Environment variables (git ignored)
│   ├── coachService.js             # Groq API integration
│   └── src/
│       ├── services/
│       │   ├── supabaseClient.js   # Supabase initialization
│       │   ├── reportService.js    # Report CRUD operations
│       │   ├── visitorAnalyticsService.js  # Visitor tracking
│       │   └── botLogsService.js   # Bot conversation logging
│       └── config/
│           ├── questions.json      # Quiz question data
│           └── messages.json       # Custom quiz messages
├── frontend/
│   ├── index.html                  # Home/landing page
│   ├── projects.html               # Projects showcase
│   ├── portfolio.html              # Portfolio page
│   ├── profile.html                # Profile page
│   ├── visitorlog.html             # Visitor analytics (admin)
│   ├── botlog.html                 # Bot logs (admin)
│   ├── admin-dashboard.html        # Admin hub
│   ├── admin-reports.html          # Report management
│   ├── js/
│   │   ├── coach-bot.js            # Chatbot functionality + logging
│   │   ├── leadership-quiz.js      # Quiz game logic
│   │   ├── clarity-game.js         # Clarity challenge
│   │   ├── presence-game.js        # Presence exercise
│   │   ├── systems-game.js         # Systems thinking game
│   │   ├── transformation-plan.js  # Plan generation
│   │   └── script.js               # Navigation and page logic
│   └── css/
│       ├── style.css               # Main styles (dark theme)
│       ├── bot.css                 # Chatbot styles
│       └── [quiz-specific].css     # Quiz styles
├── courses/
│   ├── index.html                  # Courses landing page
│   └── ai/
│       ├── index.html              # AI course hero
│       ├── about.html              # Instructor bio
│       ├── curriculum.html         # Course breakdown
│       ├── lab-tests.html          # Lab projects
│       ├── sessions/               # Individual session content
│       └── assets/
│           ├── css/style.css       # Course styles
│           └── images/
├── vercel.json                     # Vercel build configuration
└── PROJECT_CONTEXT.md              # This file

```

---

## Environment Variables (`.env`)

```bash
# Groq API for AI chatbot
GROQ_API_KEY=gsk_xxxxx...

# Supabase PostgreSQL
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Telegram notifications
TELEGRAM_TOKEN=123456789:ABCDEFxxx
TELEGRAM_CHAT_ID=1234567890

# Feature toggles
PROJECTS=ON                          # Show "What I'm Building These Days" section
PROJECTS_COACHINGSTUDIO=ON          # Individual toggles
PROJECTS_SEARCHMYJOB=ON
PROJECTS_DINESHTRADE=ON
PROJECTS_AICOURSE=ON

# Server
PORT=3000
NODE_ENV=production
```

---

## Setup Instructions for New Environment

### Prerequisites
- Node.js v18+ and npm
- Git
- A Supabase account with PostgreSQL database
- Groq API key (https://console.groq.com)
- Telegram bot token (optional, for notifications)

### Step 1: Clone & Install

```bash
# Clone repository
git clone https://github.com/dineshkwadhwani/thecoachdinesh.git
cd thecoachdinesh

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Setup Database (Supabase)

1. **Create tables** using SQL Editor in Supabase:

```sql
-- Visitor logs
CREATE TABLE visitor_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  url TEXT,
  session_id TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  referer TEXT,
  accept_language TEXT,
  country TEXT,
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  isp TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_visitor_logs_timestamp ON visitor_logs(timestamp DESC);

-- Bot logs
CREATE TABLE bot_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  timestamp TIMESTAMP DEFAULT NOW(),
  name TEXT,
  phone TEXT,
  interaction JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_bot_logs_timestamp ON bot_logs(timestamp DESC);

-- Report history
CREATE TABLE report_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lead_key TEXT,
  quiz_type TEXT,
  email TEXT,
  mobile TEXT,
  name TEXT,
  report_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transformation summary
CREATE TABLE transformation_summary (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  phone TEXT UNIQUE,
  assessment_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Enable Row Level Security (RLS)** on all tables:
   - Go to Authentication → Policies
   - For each table, enable RLS
   - Create policy:
     ```sql
     auth.role() = 'service_role'
     ```

### Step 3: Configure Environment

Create `backend/.env`:

```bash
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
TELEGRAM_TOKEN=your_telegram_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
PORT=3000
PROJECTS=ON
PROJECTS_COACHINGSTUDIO=ON
PROJECTS_SEARCHMYJOB=ON
PROJECTS_DINESHTRADE=ON
PROJECTS_AICOURSE=ON
```

### Step 4: Local Development

```bash
# Start backend server
cd backend
npm start
# Server runs on http://localhost:3000

# Open in browser
# http://localhost:3000 - Landing page
# http://localhost:3000/admin - Admin login
```

### Step 5: Vercel Deployment

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add all variables from .env
```

---

## Key Features & How They Work

### 1. Visitor Tracking
- **Middleware:** `trackVisitor` in `app.js`
- **Session Key:** IP + User Agent hash, 30-minute timeout
- **Data Captured:** IP, URL, device type, browser, OS, location
- **Geolocation:** ipinfo.io API with 24-hour cache
- **Dashboard:** `/visitorlog` - Shows analytics with pagination (50 per page)

### 2. Chatbot (Coach Dinesh Bot)
- **Location:** `frontend/js/coach-bot.js`
- **Features:**
  - Onboarding form (name, phone)
  - Real-time chat with Groq AI
  - Message limits (7 exchanges)
  - Conversation logging to `bot_logs` table
  - Telegram notification on new lead
- **Logging:** Sends full conversation history after each exchange and on window close

### 3. Admin Authentication
- **Password:** Today's date in `ddmmyyyy` format
- **Cookie:** `adminAuth=true` (HttpOnly, SameSite=Strict)
- **Timeout:** Auto-logout on browser close
- **Protected Routes:** `/visitorlog`, `/botlog`, `/admin-reports`, `/api/visitor-logs`, `/api/bot-logs`

### 4. Admin Dashboard
- **Route:** `/admin` (after login)
- **Features:**
  - 3 main tiles: Leadership Reports, Visitor Analytics, Bot Interactions
  - Each links to respective admin page
  - Logout button clears cookie

### 5. Projects Section
- **Visibility:** Controlled by `PROJECTS` env var
- **Individual Toggles:** Each project can be hidden via env var
- **Dynamic Loading:** Fetches `/api/config` on page load
- **Links:** Open in new tab, fully external

### 6. Assessment Tools
- **Types:** Leadership Reflection, Clarity Challenge, Presence, Systems Thinking
- **Output:** Generates PDF reports
- **Storage:** `report_history` table
- **Accessed via:** Modal dialogs on landing page

---

## Deployment

### Vercel Serverless Configuration

**vercel.json:**
```json
{
  "version": 2,
  "installCommand": "npm install --prefix backend",
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": "{backend/**,frontend/**,courses/**}"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Key Points:**
- All routes go through `/api/index.js`
- `courses/**` must be included in build
- Static files served through Express middleware (not CDN)
- Environment variables set in Vercel dashboard

### Deployment Steps

```bash
# 1. Push to GitHub
git add -A
git commit -m "Your message"
git push origin main

# 2. Vercel auto-deploys on push to main
# Monitor at: https://vercel.com/dashboard

# 3. Check deployment logs
vercel logs [deployment-url]

# 4. Test in browser
https://www.thecoachdinesh.com
```

---

## Important Security Notes

⚠️ **Critical:**
1. **Never commit `.env`** - Add to `.gitignore`
2. **RLS must be enabled** on all Supabase tables
3. **Admin password changes daily** - No need to update code
4. **HttpOnly cookies** - Protection against XSS
5. **CORS enabled** - Only for trusted origins
6. **Service role key** - Keep secret, never expose in frontend

✓ **Already Implemented:**
- Geolocation IP caching (24 hours)
- Session timeout (30 minutes)
- Cache-control headers on admin pages
- Input sanitization
- SQL injection prevention (Supabase parameterized queries)

---

## Common Tasks

### Add a New Assessment Tool
1. Create `frontend/js/new-tool.js`
2. Add CSS in `frontend/css/`
3. Add button on landing page
4. Store results in `report_history` table
5. Add PDF generation if needed

### Modify Chatbot Behavior
- Edit `backend/app.js` → `/chat` endpoint
- Modify `frontend/js/coach-bot.js` → `sendMessage()` for UI
- Change conversation limit in line 162

### Update Course Content
- Edit files in `/courses/ai/sessions/`
- Update curriculum in `curriculum.html`
- Font: Playfair Display (keep consistent)

### Change Admin Password Format
- Edit `backend/app.js` → `getTodaysAdminPassword()` (line 31-36)
- Current: `ddmmyyyy` (15072026)
- Can change to any format

### Enable/Disable Features
- Toggle in `backend/.env`:
  - `PROJECTS=OFF` - Hides projects section
  - `PROJECTS_SEARCHMYJOB=OFF` - Hides specific project

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Admin shows dashboard without password | Clear browser cache, ensure Cache-Control headers are set |
| Visitor logs not appearing | Check RLS is enabled, verify Supabase connection |
| Bot conversations not logged | Check `bot_logs` table exists, verify `/api/log-bot-conversation` endpoint |
| Geolocation shows "Unknown" | Check ipinfo.io API access, verify cache is working |
| Courses not tracked in visitor logs | Ensure `vercel.json` has `courses/**` in includeFiles |
| Chatbot message limit not working | Check `conversationCount` logic in `coach-bot.js` |

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
git add -A
git commit -m "Description of changes"

# Push to GitHub
git push origin feature/your-feature

# Create PR, review, merge to main
# Vercel auto-deploys after merge
```

---

## Contact & Support

- **Email:** contact@thecoachdinesh.com
- **Website:** https://www.thecoachdinesh.com
- **GitHub:** https://github.com/dineshkwadhwani/thecoachdinesh

---

## Version History

| Date | Changes |
|------|---------|
| Jul 2026 | Added bot conversation logging, projects section, RLS security |
| Jun 2026 | Implemented visitor analytics with geolocation |
| May 2026 | Launched courses platform |
| Apr 2026 | Added admin dashboard and authentication |
| Mar 2026 | Initial launch with coaching platform |

---

**Last Updated:** July 15, 2026  
**Maintained By:** Claude AI Assistant  
**Status:** ✅ Production Ready
