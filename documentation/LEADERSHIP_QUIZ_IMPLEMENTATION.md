# Leadership Style Reflection Lead-Magnet Implementation

## Overview

A complete "Reflect Your Style" lead-magnet system with two quiz tracks:

- **Quick Reflection** — config-driven question count (`quickQuestionCount`)
- **Deep Insight** — config-driven question count (`deepQuestionCount`)

Both tracks capture leads (name + phone), generate an AI-powered personalized report via Groq, and notify via Telegram. A chatbot with a form-gated onboarding and localStorage persistence supplements the quiz.

---

## Quiz Flow (Step-by-Step)

### Quick Reflection
1. User clicks "Reflect on your Style" → modal opens
2. **Step: Name** — Enter name + country code + phone number
3. **Step: Welcome** — Tailored welcome screen with Quick intro, key points, and "Start Quick Reflection" button
4. **Step: Questions** — configured quick-question count (A–D), one at a time, with progress bar
5. **Step: Email** — Email capture (lead generation)
6. **Step: Report** — AI-generated quick report with:
   - Personalized leadership insights
   - Consultation message (from `messages.json`)
   - Three action buttons: **Deep Insight**, **Send WhatsApp**, *(no Close)*

### Deep Insight (from Quick Report)
1. User clicks "Deep Insight" button on the quick report
2. **Name/phone are reused** — no re-entry required
3. **Step: Welcome** — Deep-specific welcome copy and "Start Deep Reflection" button
4. **Step: Questions** — configured deep-question count (A–D), one at a time
5. **Step: Email** — Pre-filled (reused from quick)
6. **Step: Report** — Full deep report with:
   - Extended leadership analysis
   - Deeper consultation message (from `messages.json`)
   - Two action buttons: **Send WhatsApp**, **Close**

---

## Frontend Implementation

### 1. Modal CSS (`frontend/css/leadership-quiz.css`)
- Responsive modal with smooth animations
- Progress bar tracking quiz completion ("Step N of 5")
- `.welcome-copy` styles for the welcome screen (title, intro paragraph, bullet list)

### 2. Quiz HTML Structure (`frontend/index.html`)
- Modal with **5 steps** (in DOM order):
  - `#step-welcome` — Welcome screen (initially visible)
  - `#step-name` — Name + phone capture (initially hidden)
  - `#step-questions` — Question display with A–D options
  - `#step-email` — Email capture
  - `#step-report` — AI report display
- Country code `<select>` in both the quiz name step and the chatbot onboarding form
- `#bot-onboarding-form` inside the chatbot window (see Chatbot section)

### 3. Quiz Logic (`frontend/js/leadership-quiz.js`)

#### State
- `quizType` — `'quick'` or `'deep'`
- `quizState` — tracks current step, answers, name, phone, email
- `quizMessages` — populated from `/get-questions` response; merged with `DEFAULT_QUIZ_MESSAGES` fallback

#### State
- `cachedQuizData` — result of `/get-questions` stored after first fetch on page load; reused when quiz opens to avoid a double-fetch

#### Key Functions
| Function | Purpose |
|---|---|
| `initQuizFeatureFlags()` | Runs on page load; fetches `/get-questions`, caches result, shows `#reflect-your-style-btn` only if `quizEnabled: true` |
| `normalizeQuizConfig(raw)` | Parses `quizEnabled`, `deepInsightEnabled`, question counts from server config |
| `normalizeQuizMessages(raw)` | Merges server messages with JS-side defaults |
| `renderWelcomeStep()` | Populates `#welcome-title`, `#welcome-copy`, `#welcome-start-btn` from `quizMessages.welcome` |
| `startQuizFromWelcome()` | Navigates to `quizState.welcomeNextStep` (`'questions'`) |
| `displayStep(step)` | Hides all 5 steps; shows the target step; calls `renderWelcomeStep()` when needed |
| `quizNextStep('name')` | Validates name/phone → sets `welcomeNextStep='questions'` → goes to welcome |
| `startInDepthTest()` | Sets `quizType='deep'`, `welcomeNextStep='questions'` → goes to welcome (skips name) |

#### Report Display
- **Quick report, deep enabled**: shows `quickConsultation` message + Deep Executive Analysis button
- **Quick report, deep disabled**: shows `quickConsultationDeepDisabled` message, Deep Analysis button hidden
- **Deep report**: shows `deepConsultation` message + Close button, no Deep Analysis button
- Signature role label (`Coach`) is not displayed

---

## Backend Implementation

### Routes (`backend/app.js`)

#### `GET /get-questions`
Loads questions from `backend/quiz-config.json` (question counts) and `backend/questions.json` (question text), plus messages from `backend/messages.json`. Response shape:
```json
{
  "reflectYourStyle": [...],
  "clarityAssessment": [...],
  "presenceAssessment": [...],
  "config": {
    "reflectYourStyle": {
      "quizEnabled": true,
      "deepInsightEnabled": true,
      "quickQuestionCount": 5,
      "deepQuestionCount": 5
    }
  },
  "messages": { "reflectYourStyle": { "welcome": {...}, "report": {...} } }
}
```

#### `POST /analyze-leadership`
- **Input**: `name`, `phone`, `email`, answers array, `quizType` (`'quick'` or `'deep'`)
- Counts dominant answer choice → identifies leadership style
- Calls Groq AI (`llama-3.3-70b-versatile`) for a personalized 150–200 word report
- Returns report + dominant style to frontend

#### `POST /notify-onboarding`
- Called by chatbot after user completes the onboarding form
- Sends a Telegram notification with name + phone

### Console Logging (`backend/app.js`)
Structured log format at each stage:
```
[REPORT_GENERATE] | Timestamp: ISO-8601 | Name: [Name] | Email: [Email] | Style: [Style] | Summary: [first 220 chars of report]
[REPORT_SEND]     | Timestamp: ISO-8601 | Name: [Name]
[REPORT_DONE]     | Timestamp: ISO-8601 | Name: [Name]
```
The full AI report is **not** logged — only a 220-character summary snippet.

### Telegram Integration (`backend/app.js`)
- `sendTelegramMessage()` uses an **8-second `AbortController` timeout** to prevent hanging
- `clearTimeout` called in a `finally` block to prevent memory leaks
- Fires on every new lead (quiz + chatbot onboarding)

---

## External Config Files

### `backend/quiz-config.json`
Controls feature flags and question counts:
```json
{
  "reflectYourStyle": {
    "quizEnabled": true,
    "deepInsightEnabled": true,
    "quickQuestionCount": 5,
    "deepQuestionCount": 5
  }
}
```

| Flag | Effect when `false` |
|---|---|
| `quizEnabled` | "Reflect on your Style" button stays hidden on page load |
| `deepInsightEnabled` | Deep Executive Analysis button hidden in quick report; consultation message switches to `quickConsultationDeepDisabled` |

### `backend/messages.json`
Single source of truth for all user-facing quiz text:
```json
{
  "reflectYourStyle": {
    "welcome": {
      "quickTitle": "...",
      "quickStartLabel": "Start Quick Reflection",
      "quickIntro": "...",
      "quickPoints": ["...", "...", "..."],
      "deepTitle": "...",
      "deepStartLabel": "Start Deep Reflection",
      "deepIntro": "...",
      "deepPoints": ["...", "...", "..."]
    },
    "report": {
      "quickConsultation": "Shown when deepInsightEnabled is true — references the deep report option.",
      "quickConsultationDeepDisabled": "Shown when deepInsightEnabled is false — no mention of deep report.",
      "deepConsultation": "I will be happy to provide one session of voluntary consultation..."
    }
  }
}
```

---

## Chatbot Implementation (`frontend/js/coach-bot.js`)

### Onboarding Form Gate
The chatbot window opens with a **form** (not chat messages) requiring:
- Name (text input)
- Country code (select)
- Phone number (text input)

On "Start Chat":
1. Validates name (`/^[A-Za-z][A-Za-z .'-]{1,}$/`) and phone (`/^\d{7,15}$/`)
2. Sets `userName`, `userPhone`, `onboardingStep = 'done'`
3. Saves to `localStorage` via `saveOnboardingData()`
4. Hides form, shows `#bot-messages` and `#bot-input-area`
5. Displays greeting: `"Hi <name>, welcome! How can I help you today?"`
6. Fires `POST /notify-onboarding` non-blocking

### Returning User Persistence
On every page load, `hydrateOnboardingData()` runs:
- Reads `localStorage` key `onboarding:<browserId>`
- If `{ name, phone, done: true }` is stored, restores `userName`, `userPhone`, `onboardingStep = 'done'`

`initializeBotVisibility()` then:
- Skips the onboarding form entirely
- Shows chat area directly
- If no messages exist yet, shows: `"Welcome back, <name>! Great to hear from you again."`

### Conversation Limit
After 7 exchanges the bot prompts the user to book a call directly. Counter stored in `localStorage` under `conversationCount:<browserId>`.

### localStorage Keys
| Key | Purpose |
|---|---|
| `coachBotBrowserId` | Unique anonymous browser identifier |
| `conversationCount:<browserId>` | Number of chat exchanges this browser has had |
| `onboarding:<browserId>` | `{ name, phone, done }` — persisted onboarding state |

---

## Data Flow

1. User clicks "Reflect on your Style" → quiz modal opens at the **Name** step
2. User enters name + phone → proceeds to **Welcome** screen
3. User reads welcome copy → clicks "Start Quick Reflection" → **Questions** begin
4. Configured quick-question count answered → **Email** step
5. Email submitted → `POST /analyze-leadership` called
6. Backend: determines style, calls Groq AI, logs summary, sends Telegram, returns report
7. Frontend: displays **Quick Report** with 3 action buttons
8. If user clicks **Deep Insight**: reuses name/phone, shows deep **Welcome** screen, then configured deep-question count
9. Deep email + submit → same backend flow → **Deep Report** with 2 buttons

---

## Files

### New Files
- `frontend/css/leadership-quiz.css` — Modal + welcome screen styling
- `frontend/js/leadership-quiz.js` — Full quiz logic & state management
- `backend/messages.json` — Externalized user-facing quiz text
- `backend/quiz-config.json` — Feature flags (`quizEnabled`, `deepInsightEnabled`) + question counts

### Modified Files
- `frontend/index.html` — Modal HTML (5 steps), chatbot onboarding form
- `frontend/css/bot.css` — Chatbot onboarding form styles
- `frontend/css/style.css` — `.btn-small` class
- `frontend/js/coach-bot.js` — Form-gated onboarding, localStorage persistence
- `backend/app.js` — Routes, Telegram timeout, structured logging, messages loading

---

## Leadership Styles Mapping

| Answer | Style | Description |
|---|---|---|
| A | Visionary | Big-picture, inspiring, forward-looking |
| B | Coaching | Development-focused, empathetic, mentoring |
| C | Democratic | Participative, consensual, inclusive |
| D | Pacesetter | Results-driven, high-performance, direct |

---

## How to Test

1. **Start backend**: `node backend/app.js`
2. **Open the site** in browser
3. **Quick quiz**: Click "Reflect on your Style" (visible only if `quizEnabled: true`) → enter name + phone → complete questions → enter email → view quick report
4. **Deep quiz**: From quick report, click "Deep Executive Analysis" (visible only if `deepInsightEnabled: true`) → welcome screen (no name re-entry) → complete deep questions → view deep report
5. **Toggle quiz off**: Set `"quizEnabled": false` in `quiz-config.json` and restart — button disappears from page
6. **Toggle deep off**: Set `"deepInsightEnabled": false` in `quiz-config.json` and restart — Deep Analysis button hidden, consultation message changes to `quickConsultationDeepDisabled`
7. **Chatbot**: Open bot → fill name + phone form → chat; close and reopen → should skip form and show welcome-back message
8. **Check backend logs** for `[REPORT_GENERATE]`, `[REPORT_SEND]`, `[REPORT_DONE]`
9. **Check Telegram** for lead notification

---

## Key Features

✅ **Two quiz tracks** with config-driven question counts  
✅ **Feature flags**: `quizEnabled` shows/hides the quiz button; `deepInsightEnabled` shows/hides the deep flow  
✅ **Lead capture**: Name + Phone + Email  
✅ **Welcome screen**: Tailored copy for each quiz type (from `messages.json`)  
✅ **Deep insight skips re-entry**: Name/phone reused from quick flow  
✅ **AI-powered reports**: Groq `llama-3.3-70b-versatile`, 150–200 words  
✅ **Consultation messages**: Three variants in `messages.json` — quick-with-deep, quick-without-deep, deep  
✅ **Page-load flag fetch**: `/get-questions` fetched once on load; result cached and reused when quiz opens  
✅ **Telegram notifications**: 8-second timeout, fires for quiz + chatbot leads  
✅ **Structured logging**: Summary-only (no full report in logs)  
✅ **Chatbot form gate**: Name + country code + phone before chat  
✅ **Chatbot persistence**: Returning users skip form, see welcome-back greeting  
✅ **Conversation limit**: 7 exchanges, then prompts to book a call  
✅ **Question persistence**: Users can modify answers before submitting  
✅ **Responsive design**: Works on mobile & desktop  

---

## Environment Requirements

Required in `.env`:
```
GROQ_API_KEY=...
TELEGRAM_TOKEN=...
TELEGRAM_CHAT_ID=...
```
