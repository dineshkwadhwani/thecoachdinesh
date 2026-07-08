# Vercel Environment Variables Setup

## Problem
Reports created on the deployed site are not being saved to Supabase because the environment variables are not configured on Vercel.

**Local environment** (.env in backend folder): ✓ Working  
**Vercel deployment**: ✗ Missing credentials → reports go to file storage instead

## Solution

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: **thecoachdinesh**
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Add These Environment Variables

Copy these from your local `backend/.env` file and add them to Vercel:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://nzhnyyysrxnxehnichbr.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (the full key) |
| `GROQ_API_KEY` | Your Groq API key |
| `TELEGRAM_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

### Step 3: Set Scope
For each variable, make sure the scope includes:
- ✓ Production
- ✓ Preview  
- ✓ Development (optional)

### Step 4: Redeploy
After adding the variables:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

### Step 5: Verify
Test by creating a new report on the deployed site. Check the Supabase dashboard to confirm reports appear in the `report_history` table.

## Security Note
Never commit `.env` files with actual credentials to git. The credentials shown in this file are for reference only. Always use the Vercel dashboard for sensitive values in production.
