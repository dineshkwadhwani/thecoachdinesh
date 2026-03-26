# Executive Presence Simulator Lead-Magnet Implementation

## Overview

A complete **Executive Presence** lead-magnet simulator designed as the third assessment in the coaching suite.

- Launches from the **Leadership Presence** tile via **Check your presence**
- Uses `presenceAssessment` from `backend/questions.json`
- Config-driven enable/disable and scenario count via `backend/quiz-config.json` (`executivePresence`)
- Scenario data includes image + prompt + 4 options per scenario
- Captures name + phone + email
- Sends selected `presenceType` values to backend for AI analysis
- UI/report copy is message-driven via `backend/messages.json` (`executivePresence`)
- Returns and displays a personalized presence report

---

## Quiz Flow (Step-by-Step)

1. User clicks **Check your presence**
2. **Step: Identity** — Name + country code + phone
3. **Step: Welcome** — Simulator context and instructions
4. **Step: Scenario Loop** — Configured number of scenarios (up to available pool) in fixed order:
   - Full-width scenario image
   - Prompt text
  - Four option cards (Power Move choices) with explicit selection
  - Previous + Next navigation supported (no auto-advance on click)
5. **Step: Email** — Email capture
6. **Step: Report** — AI-generated executive presence report with signature, consultation copy, WhatsApp CTA, and Close

---

## Frontend Implementation

### 1. Styles (`frontend/css/presence.css`)
- Presence-specific scenario UI:
  - `presence-scenario-image`
  - `presence-options-grid`
  - `presence-option-card` with hover lift and selected state
- Consistent modal structure and controls by reusing existing quiz modal classes from `index.html`

### 2. HTML Structure (`frontend/index.html`)
- Tile CTA button:
  - `#presence-launch-btn` → `openPresenceGame()`
- Modal container:
  - `#presence-modal`
- Steps:
  - `#presence-step-identity`
  - `#presence-step-welcome`
  - `#presence-step-question`
  - `#presence-step-email`
  - `#presence-step-report`

### 3. Logic (`frontend/js/presence-game.js`)

#### Data Keys
- Config key: `executivePresence`
- Questions key: `presenceAssessment`
- Messages key: `executivePresence`

#### Key Functions
| Function | Purpose |
|---|---|
| `initPresenceGame()` | Loads `/get-questions`, applies config/messages, prepares scenarios, enables launch button only when `quizEnabled` is true |
| `presenceContinueFromIdentity()` | Validates name + phone |
| `presenceStartFromWelcome()` | Starts question loop |
| `presenceRenderQuestion()` | Renders current image, prompt, and option cards |
| `presenceSelectOption()` | Stores selected `presenceType` for current scenario |
| `presenceNextQuestion()` | Enforces selection and moves to next scenario/email |
| `presencePrevQuestion()` | Moves back and restores prior selection |
| `presenceSubmitEmail()` | Validates email and posts to `/analyze-presence` |
| `presenceRenderReport()` | Displays AI report + message-driven consultation/CTA actions |

#### Config Behavior
- `quizEnabled`: controls visibility of `#presence-launch-btn`
- `scenarioCount`: number of scenarios used from `presenceAssessment` (capped by available pool)

#### State Captured
- `name`
- `phone` (`countryCode + digits`)
- `email`
- `answers[]` with `presenceType`, `choiceText`, `scenarioId`

---

## Backend Implementation

### Route: `POST /analyze-presence` (`backend/app.js`)

#### Input
- `name`
- `phone` (`+` + 7–15 digits)
- `email`
- `powerMoves` (array of `presenceType` labels)

#### Processing
- Validates payload and enforces `powerMoves.length === config.executivePresence.scenarioCount`
- Calls Groq (`llama-3.3-70b-versatile`)
- System prompt asks model to classify style as:
  - Quiet Authority
  - Strategic Influence
  - Executive Presence Leaks
- Generates ~180-word encouraging report with coaching-bundle CTA
- Logs summary and sends Telegram lead notification

#### Output
```json
{
  "name": "...",
  "phone": "+9198...",
  "email": "...",
  "summary": "...",
  "report": "..."
}
```

---

## Data Source

### `backend/questions.json`
Presence scenarios are embedded under:
```json
{
  "presenceAssessment": [
    {
      "id": 1,
      "image": "...",
      "short_description": "...",
      "options": [
        { "text": "...", "label": "A", "presenceType": "..." }
      ]
    }
  ]
}
```

Image paths are served from frontend static files and use `images/...` URLs.

The frontend reads the first `scenarioCount` scenarios in fixed order.

### `backend/quiz-config.json`
```json
{
  "executivePresence": {
    "quizEnabled": true,
    "scenarioCount": 10
  }
}
```

### `backend/messages.json` (`executivePresence`)
- `identity`: name/phone step copy
- `welcome`: intro + scenario instruction
- `progress`: step labels and question progress template
- `labels`: question counter + next/results button text
- `email`: email step title/intro/button/loading text
- `report`: title, consultation copy, WhatsApp/Close button labels

---

## Data Flow

1. Frontend loads `/get-questions`
2. Reads `config.executivePresence`, `messages.executivePresence`, and `presenceAssessment`
3. User completes identity + configured number of choices + email
4. Frontend posts `{ name, phone, email, powerMoves }` to `/analyze-presence`
5. Backend creates AI report, logs summary, sends Telegram notification
6. Frontend renders report in modal

---

## Files

### Core Files
- `frontend/js/presence-game.js`
- `frontend/css/presence.css`
- `frontend/index.html`
- `backend/app.js`
- `backend/questions.json` (`presenceAssessment`)
- `backend/quiz-config.json` (`executivePresence`)
- `backend/messages.json` (`executivePresence`)

---

## How to Test

1. Start backend: `node backend/app.js`
2. Open site and click **Check your presence**
3. Complete configured scenarios and email step
4. Confirm report appears in modal
5. Verify report includes signature, consultation copy, WhatsApp button, and Close button
6. Toggle `executivePresence.quizEnabled` to false and confirm launch button hides
7. Change `executivePresence.scenarioCount` and confirm question count/progress updates
8. Check logs for `[PRESENCE_GENERATE]`
9. Verify Telegram message for new Executive Presence lead

---

## Key Features

✅ Fully integrated third assessment in same site flow
✅ Uses shared `questions.json` data source
✅ Config-driven enable/disable and scenario count
✅ Image + 4-option high-readability scenario UI
✅ Name/phone/email lead capture consistency
✅ Previous + Next navigation during scenario loop
✅ Message-driven copy via `messages.json`
✅ Signature + lead-generation + WhatsApp/Close actions in report
✅ AI report generation via Groq
✅ Telegram notifications + structured backend logs
