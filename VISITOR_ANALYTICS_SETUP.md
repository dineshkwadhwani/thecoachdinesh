# Visitor Analytics Setup

## Step 1: Create Supabase Table

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
CREATE TABLE visitor_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT NOT NULL,
  url TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast queries by timestamp
CREATE INDEX idx_visitor_logs_timestamp ON visitor_logs(timestamp DESC);
CREATE INDEX idx_visitor_logs_session_id ON visitor_logs(session_id);

-- Enable Row Level Security (optional)
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to read
CREATE POLICY "Service role can read" ON visitor_logs
  FOR SELECT USING (true);
```

## Step 2: Deploy Code Changes

The backend will:
- Track first visitor to a session using cookies
- Log to Supabase visitor_logs table
- Provide `/api/visitor-logs?page=1` endpoint (protected)
- Serve dashboard at `/visitorlog` (protected)

## Step 3: Test

1. Visit https://www.thecoachdinesh.com
2. Check Supabase table for new entry
3. Go to https://www.thecoachdinesh.com/visitorlog to see analytics
