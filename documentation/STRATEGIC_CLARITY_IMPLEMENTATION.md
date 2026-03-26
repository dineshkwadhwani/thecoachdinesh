# Strategic Clarity Diagnostic Lead-Magnet Implementation

## Overview

A complete **Strategic Clarity** lead-magnet diagnostic that tests a leader’s ability to separate **Signal vs Noise** in high-pressure scenarios.

- Dynamic scenario count via config (`backend/quiz-config.json`)
- Name + phone + email lead capture
- AI-generated clarity report via Groq
- Telegram notification on lead submission
- Config-driven UX copy via `backend/messages.json`

---

## Quiz Flow (Step-by-Step)

1. User clicks **Take the Clarity Challenge**
2. **Step: Identity** — Enter name + country code + phone
3. **Step: Welcome** — Intro + challenge framing (from `messages.json`)
4. **Step: Game** — Scenario-by-scenario signal/noise interaction
5. **Step: Email** — Email capture
6. **Step: Loading** — Analysis in progress
7. **Step: Report** — AI-generated report + WhatsApp CTA

---

## Frontend Implementation

### 1. Styles (`frontend/css/clarity-game.css`)
- Dedicated styles for clarity-specific game interactions
- Signal/noise tag interactions (`dismissed-noise`, `dismissed-signal`)
- Report summary pills and CTA section
- Reuses shared modal/progress/button styles from `leadership-quiz.css`

### 2. HTML Structure (`frontend/index.html`)
- Modal container: `#clarity-modal`
- Steps:
  - `#clarity-step-identity`
  - `#clarity-step-welcome`
  - `#clarity-step-game`
  - `#clarity-step-email`
  - `#clarity-step-loading`
  - `#clarity-step-report`
- Launch button in Approach tile: `#clarity-launch-btn`

### 3. Logic (`frontend/js/clarity-game.js`)

#### Data Keys
- Config key: `strategicClarity`
- Questions key: `clarityAssessment`
- Messages key: `strategicClarity`

#### Key Functions
| Function | Purpose |
|---|---|
| `initClarityGame()` | Loads `/get-questions`, applies config/messages, enables launch button |
| `normalizeClarityConfig()` | Applies defaults for `quizEnabled`, `scenarioCount` |
| `normalizeClarityMessages()` | Applies default message fallbacks |
| `clarityNextFromIdentity()` | Validates name + phone and moves to welcome |
| `clarityStartGame()` | Selects configured number of scenarios and starts game |
| `clarityHandleTagClick()` | Scores noise-cleared and signals-missed interactions |
| `claritySubmitEmail()` | Validates email and moves to analysis |
| `clarityStartAnalysis()` | Calls `/analyze-clarity` |
| `clarityRenderReport()` | Renders score summary, AI report, consultation and CTA |

#### Scoring Model
- `noiseCleared`: correctly dismissed noise items
- `signalsMissed`: incorrectly dismissed signal items
- `noiseScore`: `round((noiseCleared / totalNoise) * 100)`

---

## Backend Implementation

### Route: `POST /analyze-clarity` (`backend/app.js`)

#### Input
- `name`
- `phone` (`+` + 7–15 digits)
- `email`
- `noiseCleared`
- `signalsMissed`
- `totalNoise`
- `totalSignals`
- `noiseScore`

#### Processing
- Validates request payload
- Calls Groq (`llama-3.3-70b-versatile`)
- Produces ~180-word leadership clarity report
- Logs summary and sends Telegram notification

#### Output
```json
{
  "name": "...",
  "noiseScore": 72,
  "noiseCleared": 18,
  "signalsMissed": 4,
  "totalNoise": 25,
  "totalSignals": 20,
  "report": "..."
}
```

---

## Config & Messages

### `backend/quiz-config.json`
```json
{
  "strategicClarity": {
    "quizEnabled": true,
    "scenarioCount": 5
  }
}
```

### `backend/messages.json` (`strategicClarity`)
- `welcome`: title, intro, scenario instruction, outcome, start button
- `progress`: identity/welcome/game/email/loading/report labels
- `labels`: scenario label + next/report button text
- `report`: title, consultation copy, WhatsApp message + button labels

Supported placeholders:
- `{scenarioCount}`
- `{current}` / `{total}`
- `{name}` / `{noiseScore}`

---

## Data Flow

1. Frontend loads `/get-questions`
2. Uses `clarityAssessment` from `questions.json`
3. Applies `strategicClarity` config and messages
4. User completes diagnostic
5. Frontend posts metrics to `/analyze-clarity`
6. Backend generates AI report + logs + Telegram
7. Frontend renders report + WhatsApp CTA

---

## Files

### Core Files
- `frontend/js/clarity-game.js`
- `frontend/css/clarity-game.css`
- `frontend/index.html`
- `backend/app.js`
- `backend/questions.json` (`clarityAssessment`)
- `backend/quiz-config.json` (`strategicClarity`)
- `backend/messages.json` (`strategicClarity`)

---

## How to Test

1. Start backend: `node backend/app.js`
2. Open site and verify **Take the Clarity Challenge** button is visible
3. Complete flow: Identity → Welcome → Game → Email → Report
4. Confirm report renders and WhatsApp button is generated
5. Check backend logs for `[CLARITY_GENERATE]`, `[CLARITY_SEND]`, `[CLARITY_DONE]`
6. Verify Telegram lead message is received

---

## Key Features

✅ Config-driven scenario count and enable/disable
✅ Full lead capture (name + phone + email)
✅ Signal-vs-noise interaction-based scoring
✅ Message-driven UI copy and labels
✅ AI clarity report generation
✅ Telegram integration and structured logging
