# SIT Agentic AI Workshop — Complete Pack

Faculty Development Workshop, Symbiosis Institute of Technology, Pune
Day 2 (10 Sept 2026, 1.30–4.00 pm) and Day 3 (11 Sept 2026, 9.30 am–4.00 pm)
Facilitator: Mr. Dinesh Wadhwani

---

## WHAT TO DO FIRST

Three things are time-critical.

### 1. Send folder 01 to your lab incharge — today

`01_Lab_Incharge/PDF3_Lab_Setup_Instructions.pdf`

It is split into two tiers. **Tier 1 is browser, VS Code and network access** — about twelve minutes per machine, and it is all the workshop actually needs. **Tier 2 is Node.js and n8n**, which enables optional comparison exercises.

The document tells them explicitly that Tier 1 done on all forty machines beats both tiers done on twenty-five, and that reporting "Tier 2 did not happen" on Tuesday is an acceptable answer.

### 2. Go to the lab on Monday and test the network yourself

Two endpoints decide whether the workshop runs:

- `generativelanguage.googleapis.com` — carries every AI request. Proxies commonly allow `aistudio.google.com` (so the site loads and everything looks configured) while silently blocking this one.
- `console.apify.com` — a full cloud IDE in the browser. Some content filters classify cloud IDEs as developer tools and block them.

Section 6.2 of PDF3 has a script for the first. The second needs you to actually open the page and confirm the editor renders.

If either is blocked you need to know Monday, not Wednesday.

### 3. Pin the Gemini model identifier and write it on the board

Every Actor in the pack takes the model as an input field, defaulting to `gemini-2.5-flash`. The free-tier lineup shifted during 2026 — the Pro models moved behind billing.

Confirm the current free-tier Flash identifier in AI Studio on Monday and write it up. One wrong identifier across forty machines is forty HTTP 400 errors.

---

## FOLDER CONTENTS

### 01_Lab_Incharge
| File | Pages | For |
|---|---|---|
| PDF3_Lab_Setup_Instructions.pdf | 19 | Your lab incharge / sysadmin |

### 02_Participant_Handouts
Print or share these with faculty.

| File | Pages | What it is |
|---|---|---|
| PDF1_Study_Material.pdf | 54 | The concepts. Read during and kept after. |
| PDF2_Lab_Manual.pdf | 94 | Lab Tests 0–11, step by step, all code complete |
| PDF5_Lab12_Attendance_System.pdf | 37 | The attendance use case, four ways |
| PDF6_Capstone_Starter_Pack.pdf | 43 | Two cores, tool library, five lanes |

### 03_Facilitator
| File | What it is |
|---|---|
| PPT1_Workshop_Slides.pptx | 72 slides, speaker notes embedded per slide |
| PDF4_Speaker_Notes.pdf | 21 pages. Same notes printed, plus timing and contingencies. |

### 04_Shared_Folder_For_Lab_Machines
Copy this folder to every lab machine, or put it on a network share. Confirm the path with your lab incharge and write it on the board.

| File | What it is |
|---|---|
| Attendance_Sample_Data.xlsx | Sample data for Lab 12. Two tabs — data and a READ ME. |
| Attendance_Sample_Data.csv | Same data as CSV |

---

## HOW THE TWO TRACKS WORK

**Track A is Apify.** The spine. Nothing installs, everything runs in a browser, faculty write the agent loop themselves and their work lives in their own account.

**Track B is n8n.** The counterpoint, and it may not run. It depends on Tier 2 of the lab setup.

**If Track B is not available**, say so once at the start of Day 2 without apology — it was designed to be droppable. Skip Lab Tests 3B, 7B and 9B and give the platform comparison verbally. Every concept is taught on Track A.

---

## THE RUN SHEET

### Day 2 — 10 September, 1.30–4.00 pm

| Time | | |
|---|---|---|
| 1.30 | Opening and contract | 10 min |
| 1.40 | What actually changed | 12 min |
| 1.52 | Prompts — RCTFG | 25 min |
| 2.17 | **Lab Tests 1 & 2** — prompting, then a Gem | 65 min |
| 3.22 | Your first Actor | 18 min |
| 3.40 | **Lab Test 3A** — begins, continues Day 3 | 20 min |

Dr. Nilima Zade has the morning. Do not re-teach it. Open with: *"This morning you saw what an agent is. This afternoon you build one."*

### Day 3 — 11 September, 9.30 am–4.00 pm

| Time | | |
|---|---|---|
| 9.30 | Opening, keys, rate limits | 20 min |
| 9.50 | **Lab Tests 3A & 3B** — finish the Actor, then n8n | 40 min |
| 10.30 | **Lab Tests 4A & 5A** — Gemini, structured output | 70 min |
| 11.40 | From sequence to agent | 22 min |
| 12.02 | **Lab Test 6A** — the agent loop, by hand | 55 min |
| 12.57 | Lunch | 60 min |
| 1.57 | Tools — the arithmetic failure | 25 min |
| 2.22 | **Lab Tests 7A & 7B** — attainment, both platforms | 90 min |
| 3.52 | Close | 8 min |

**This does not fit.** Day 3 has roughly five working hours and the full material needs seven. Decide in advance what you are dropping:

| Priority | Content | Drop? |
|---|---|---|
| Essential | 6A, 7A, the tools section | Never |
| High | Lab 12 attendance, multi-agent 8A | Only under pressure |
| Medium | Capstone | Shorten to 45 min |
| Droppable | 3B, 7B, 9B (all Track B) | First to go |
| Droppable | 9A web-fetch tool | Already replaced by Lab 12 |

**Recommended shape:** drop 9A and 9B entirely, run Lab 12 in the afternoon, and give the capstone 60 minutes rather than 75. That gets you an honest Day 3.

---

## THE TWO MOMENTS TO REHEARSE

### The arithmetic failure — Lab 7A, Part A

Run it live. Paste twenty students of marks into a prompt, ask for CO3 attainment, and write the answer on the whiteboard. Count the rows with the room. Then run it twice more and write those numbers beside the first.

Three different answers to one arithmetic question. **The correct answer is 55.00%, 11 of 20.** Most runs land between 60 and 75 — enough to move the attainment level by two bands.

That whiteboard is the most persuasive object in the two days. Leave it up.

### The moderator overruling the grader — Lab 8A

The Actor logs a line reading `*** MODERATOR OVERRULED THE GRADER: 8 -> 5 ***`.

The sample submissions are rigged for this: S003 is correct but awkwardly written, S004 is fluent and wrong. Rehearse on your data until the overrule reliably fires. If it does not, the payoff of the whole multi-agent section is lost.

---

## EIGHT THINGS TO REPEAT

1. **Personal Gmail, not institutional.** Institutional accounts hide features with no error message. Say it three times; it will still catch two people.
2. **Add the API key, THEN rebuild.** Environment variables apply at build time. This catches a third of the room.
3. **Never put a key in an input field.** Input values are stored with the run record.
4. **maxIterations = 5**, set before the first run.
5. **Three items, never thirty**, while building.
6. **Memory at 512 MB** before every Apify run.
7. **Export every dataset** — seven-day free-tier retention.
8. **Revoke both keys** at the end of Day 3. Walk them through it.

Track B only: **JavaScript Code node, never Python.** The Python node fails on npm installs with a missing virtual environment error.

---

## THE AGENTS THEY BUILD

Eight distinct agents, plus non-agent builds.

| Lab | Build | Agent? |
|---|---|---|
| 2 | QP Generator (a Gem) | No — saved prompt |
| 3A / 3B | Grade calculator | No — plain code |
| 4A / 5A | Feedback and structured output Actors | No — fixed sequence |
| 6A | Teaching Assistant | **Yes — the first** |
| 7A / 7B | CO–PO Attainment | **Yes** |
| 8A | Grader, Moderator, Feedback Writer | **Yes — three** |
| 10A | Doubt-Solving | **Yes** |
| 12 Part B | Attendance decision agent | **Yes** |
| Capstone | Their own | **Yes** |

**Four of these share identical loop code.** 6A, 7A, 10A and the capstone cores are byte-for-byte the same sixty lines. Only the tools and instructions change.

That is the central lesson of Day 3, and it means far less code to paste — 7A and 10A both say "duplicate 6A, replace only the tools block."

---

## STILL TO DO

Two gaps you may want filled before Wednesday:

- **Deck slides for Lab 12 and the capstone.** Roughly eight slides, including the R004 / R007 / R011 comparison that makes the workflow-versus-agent case.
- **Speaker notes update** for the Day 3 afternoon reshuffle, since Lab 12 displaces 9A and 9B.

---

## A NOTE ON THE FREE TIERS

Everything runs at zero cost. Two limits to know:

**Gemini Flash** — roughly 15 requests per minute, low thousands per day, per key. Everyone has their own key so the room does not compete.

**Apify** — $5 platform credit monthly, 25 concurrent runs, **seven-day data retention**. At 512 MB a run costs a fraction of a cent; forty to sixty runs across two days is about $0.15 of the $5.

Worth raising with your department afterwards: the **Apify Creator Plan** is $1/month with a one-time $500 platform credit to spend within six months, and **Apify for Universities** gives around 50% off paid plans for verified academic use.
