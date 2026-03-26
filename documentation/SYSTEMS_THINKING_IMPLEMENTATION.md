# Systems Thinking Diagnostic Lead-Magnet Implementation

## Overview

A complete **Systems Thinking** assessment that helps leaders rank organizational impact areas from most affected to least affected.

- Launches from the **Systems Thinking** tile via **Test System Thinking**
- Uses scenario bank from `backend/questions.json` under `systemsAssessment`
- Config-driven enable/disable and question count via `backend/quiz-config.json` (`systemsThinking`)
- Message-driven UI and report copy via `backend/messages.json` (`systemsThinking`)
- Captures name + phone + email and generates AI report via Groq
- Sends Telegram lead notifications

---

## Quiz Flow (Step-by-Step)

1. User clicks **Test System Thinking**
2. **Step: Identity** — Name + country code + phone
3. **Step: Welcome** — Diagnostic purpose, what it analyzes, and expected outcome
4. **Step: Scenario Loop** — Configured number of scenarios from a randomized pool
   - User ranks domains in impact hierarchy (top = most impacted)
   - Previous/Next navigation is supported
5. **Step: Email** — Email capture
6. **Step: Report** — AI-generated systems thinking report + signoff + WhatsApp + Close

---

## Frontend Implementation

### 1. Styles (`frontend/css/systems-game.css`)
- Domain ranking layout (available domains + ranked hierarchy)
- Reuses shared modal/progress/button visuals from existing quiz styles
- Responsive stack on smaller screens

### 2. HTML Structure (`frontend/index.html`)
- Launch button: `#systems-launch-btn`
- Modal: `#systems-modal`
- Steps:
  - `#systems-step-identity`
  - `#systems-step-welcome`
  - `#systems-step-question`
  - `#systems-step-email`
  - `#systems-step-report`

### 3. Logic (`frontend/js/systems-game.js`)

#### Data Keys
- Config key: `systemsThinking`
- Messages key: `systemsThinking`
- Questions key: `systemsAssessment`

#### Key Functions
| Function | Purpose |
|---|---|
| `initSystemsGame()` | Loads `/get-questions`, applies config/messages, prepares launch visibility |
| `openSystemsGame()` | Randomizes pool and selects configured scenario count |
| `systemsContinueFromIdentity()` | Validates name + phone and starts flow |
| `systemsRenderQuestion()` | Renders scenario, available domains, and ranked hierarchy |
| `systemsSelectDomain()` | Adds domain in order clicked (impact hierarchy) |
| `systemsRemoveDomain()` | Removes ranked domain to adjust order |
| `systemsNextQuestion()` | Enforces complete ranking before moving ahead |
| `systemsSubmitEmail()` | Validates email and posts responses to backend |
| `systemsRenderReport()` | Renders AI report + consultation + WhatsApp/Close actions |

#### Ranking Payload
Each scenario answer is sent as:
```json
{
  "scenarioId": "ST01",
  "scenario": "...",
  "orderedDomains": ["Operations & Workflow", "Strategic Alignment", "..."]
}
```

---

## Backend Implementation

### Route: `POST /analyze-systems` (`backend/app.js`)

#### Input
- `name`
- `phone` (`+` + 7–15 digits)
- `email`
- `rankings` (array of per-scenario impact hierarchies)

#### Validation
- Name present
- Phone format valid
- Email format valid
- `rankings.length` must equal configured `systemsThinking.scenarioCount`

#### AI Analysis
- Uses Groq model `llama-3.3-70b-versatile`
- Prompt evaluates linear vs systems-level pattern
- Generates ~200-word report with:
  1) Pattern summary
  2) Leadership lens interpretation
  3) Hidden connection insight
  4) Practical improvement habits

#### Logging / Notification
- Logs `[SYSTEMS_GENERATE]`, `[SYSTEMS_SEND]`, `[SYSTEMS_DONE]`
- Sends Telegram lead notification with summary snippet

---

## Config and Content

### `backend/quiz-config.json`
```json
{
  "systemsThinking": {
    "quizEnabled": true,
    "scenarioCount": 5
  }
}
```

### `backend/messages.json` (`systemsThinking`)
Contains:
- `identity`
- `welcome`
- `progress`
- `labels`
- `email`
- `report`

### `backend/questions.json` (`systemsAssessment`)
- Contains at least 25 scenarios
- Each scenario has `id`, `scenario`, and `domains[]`
- Each domain contains `name`, `weight`, and `description`

---

## Files

- `frontend/index.html`
- `frontend/js/systems-game.js`
- `frontend/css/systems-game.css`
- `backend/app.js`
- `backend/quiz-config.json`
- `backend/messages.json`
- `backend/questions.json`

---

## How to Test

1. Start backend: `node backend/app.js`
2. Open site and confirm **Test System Thinking** appears (when `quizEnabled=true`)
3. Complete flow: Identity → Welcome → Rank domains across scenarios → Email → Report
4. Verify report includes signature, lead-gen message, WhatsApp, and Close
5. Change `systemsThinking.scenarioCount` and verify question count changes
6. Set `systemsThinking.quizEnabled=false` and verify launch button hides
7. Check backend logs for systems events and Telegram notification

---

## Key Features

✅ Fourth assessment integrated into same modal architecture  
✅ Config-driven enable/disable + scenario count  
✅ Message-driven UI and report copy  
✅ Impact hierarchy interaction (most to least impacted)  
✅ Randomized scenario pool selection per session  
✅ AI systems-thinking analysis report  
✅ Telegram notifications and structured logging
