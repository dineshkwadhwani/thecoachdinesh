# Where Things Are Kept — Knowledge Base Builder

A single static page. Participants list their storage places, list their things,
tap where each one lives, and print the result as a PDF to feed a voice agent.

## Deploy to Vercel

**Option A — drag and drop**

1. Go to vercel.com/new
2. Drag this whole folder onto the page
3. Deploy. No build step, no framework preset needed.

**Option B — CLI**

    npm i -g vercel
    vercel

Accept the defaults. When asked for a framework, choose **Other**.

## Files

- `index.html` — the entire app. No dependencies, no build, works offline.
- `vercel.json` — clean URLs and two safe response headers. Optional.

## How participants use it

1. **Storage places.** Eleven defaults are prefilled and all editable. Add, remove, or reset.
2. **Things.** A 124-item list is prefilled, comma separated, grouped by category.
   Lines beginning `Category:` become headings. They delete what they don't own
   and add what's missing.
3. **Generate my app.** Builds a tapping interface from their own two lists.
4. **Tap through.** One tap per item. Progress bar, next-unanswered jump, hide-answered.
   *Save progress* downloads a JSON file; *Load* restores it.
5. **Generate my list.** Produces a formatted document.
6. **Save as PDF.** Opens the browser print dialog. Choose "Save as PDF" as the destination.
   *Download HTML* is there as a fallback.

## Privacy

Nothing leaves the browser. There is no backend, no analytics, no storage API.
Closing the tab loses unsaved work, which is why *Save progress* exists.

## What the generated document contains

- Answering rules for the agent, including an explicit never-guess instruction
- A table of places with a count of what's in each
- Every item with its location, grouped by category
- A reverse index: what is in each place
- Things the household doesn't own
- Things another person keeps track of
- A closing guardrail listing the only valid places

The never-guess rule matters more than it looks. A voice agent that invents a
location sounds exactly as confident as one that knows, and sends someone
searching the wrong room.
