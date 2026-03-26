# Assessment Implementation Docs

This folder contains implementation notes for the three coaching assessments and their backend/frontend integration.

## Guides

- [Leadership Style Reflection](./LEADERSHIP_QUIZ_IMPLEMENTATION.md)
  - Reflect Your Style (quick + deep)
  - Feature flags and config-driven question counts
  - AI report generation, logging, and Telegram notifications

- [Strategic Clarity Diagnostic](./STRATEGIC_CLARITY_IMPLEMENTATION.md)
  - Signal-vs-noise scenario flow
  - Config-driven scenario count and message-driven UI copy
  - Clarity scoring model and report pipeline

- [Executive Presence Simulator](./EXECUTIVE_PRESENCE_IMPLEMENTATION.md)
  - Presence scenario flow with image-based prompts
  - Config-driven enable/disable + scenario count
  - Message-driven UI/report copy and report action block

## Shared Runtime Endpoints

- `GET /get-questions`
  - Returns all assessment datasets plus `config` and `messages` payloads.

- `POST /analyze-leadership`
- `POST /analyze-clarity`
- `POST /analyze-presence`
  - Accept lead + response payloads, generate AI reports, and send Telegram lead notifications.

## Related Config/Data Files

- `backend/questions.json` — assessment question/scenario banks
- `backend/quiz-config.json` — per-assessment feature flags and counts
- `backend/messages.json` — per-assessment UI/report copy templates
