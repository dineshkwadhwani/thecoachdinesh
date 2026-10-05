from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT_DIR = Path(__file__).parent
NAVY = colors.HexColor("#11243a")
BLUE = colors.HexColor("#2563a6")
TEAL = colors.HexColor("#17806d")
INK = colors.HexColor("#243247")
MUTED = colors.HexColor("#5b6878")
PALE = colors.HexColor("#edf3f8")
LINE = colors.HexColor("#d5dee8")


class HandoutDocTemplate(BaseDocTemplate):
    def __init__(self, filename, title):
        super().__init__(str(filename), pagesize=letter, title=title,
                         author="The Coach Dinesh", leftMargin=0.72 * inch,
                         rightMargin=0.72 * inch, topMargin=0.72 * inch,
                         bottomMargin=0.68 * inch)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height,
                      id="main", leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id="branded", frames=frame,
                                           onPage=self.draw_chrome))

    def draw_chrome(self, canvas, doc):
        canvas.saveState()
        width, height = letter
        canvas.setFillColor(NAVY)
        canvas.rect(0, height - 0.16 * inch, width, 0.16 * inch, fill=1, stroke=0)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 0.38 * inch, "AI FOR WORKING PROFESSIONALS")
        canvas.drawRightString(width - doc.rightMargin, 0.38 * inch,
                               f"{doc.page}")
        canvas.setStrokeColor(LINE)
        canvas.line(doc.leftMargin, 0.54 * inch, width - doc.rightMargin,
                    0.54 * inch)
        canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("HandoutTitle", parent=base["Title"],
                                fontName="Helvetica-Bold", fontSize=27,
                                leading=31, textColor=NAVY, alignment=TA_LEFT,
                                spaceAfter=8),
        "subtitle": ParagraphStyle("Subtitle", parent=base["Normal"],
                                   fontName="Helvetica", fontSize=11,
                                   leading=16, textColor=MUTED, spaceAfter=18),
        "eyebrow": ParagraphStyle("Eyebrow", parent=base["Normal"],
                                  fontName="Helvetica-Bold", fontSize=8,
                                  leading=11, textColor=TEAL, spaceAfter=7),
        "h1": ParagraphStyle("SectionHeading", parent=base["Heading1"],
                             fontName="Helvetica-Bold", fontSize=17,
                             leading=21, textColor=NAVY, spaceBefore=10,
                             spaceAfter=9, keepWithNext=True),
        "h2": ParagraphStyle("Subheading", parent=base["Heading2"],
                             fontName="Helvetica-Bold", fontSize=11,
                             leading=14, textColor=BLUE, spaceBefore=7,
                             spaceAfter=4, keepWithNext=True),
        "body": ParagraphStyle("BodyTextCustom", parent=base["BodyText"],
                               fontName="Helvetica", fontSize=9.3,
                               leading=13.5, textColor=INK, spaceAfter=7),
        "small": ParagraphStyle("SmallText", parent=base["BodyText"],
                                fontName="Helvetica", fontSize=8.3,
                                leading=11.5, textColor=INK, spaceAfter=4),
        "bullet": ParagraphStyle("BulletText", parent=base["BodyText"],
                                 fontName="Helvetica", fontSize=9,
                                 leading=12.5, textColor=INK, leftIndent=13,
                                 firstLineIndent=-8, spaceAfter=4),
        "label": ParagraphStyle("Label", parent=base["Normal"],
                               fontName="Helvetica-Bold", fontSize=8,
                               leading=10, textColor=NAVY),
        "center": ParagraphStyle("CenterText", parent=base["Normal"],
                                fontName="Helvetica", fontSize=8,
                                leading=11, textColor=MUTED,
                                alignment=TA_CENTER),
    }


def p(text, style):
    return Paragraph(text, style)


def bullet(text, style):
    return Paragraph(f"&#8226; {text}", style)


def heading_block(section, title, description, s):
    return [p(section.upper(), s["eyebrow"]), p(title, s["title"]),
            p(description, s["subtitle"])]


def callout(title, text, s, color=BLUE):
    cell = [p(title, s["label"]), Spacer(1, 4), p(text, s["small"])]
    table = Table([[cell]], colWidths=[6.95 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def make_quick_reference(s):
    story = heading_block(
        "Field guide / 01",
        "AI at Work: Quick Reference",
        "A practical guide to choosing the right task, prompting clearly, building repeatable workflows, and checking the result before it leaves your hands.",
        s,
    )
    story += [callout("THE WORKING PRINCIPLE",
                      "Use AI to accelerate a bounded task. Keep a person accountable for the context, verification, and final decision.", s, TEAL),
              Spacer(1, 12), p("01  Choose a good task", s["h1"]),
              p("Start with work that is frequent, clearly described, and easy to check. AI is usually most useful as a first-draft partner, summarizer, organizer, or option generator.", s["body"])]
    for item in [
        "Good starting points: summarize non-sensitive material, draft routine communications, classify or organize information, prepare meeting agendas, and compare clearly stated options.",
        "Pause before use when the task involves high-impact decisions, confidential data, unclear ownership, or facts that cannot be independently checked.",
        "Define success first: what should improve, how will you measure quality, and what must remain a human decision?",
    ]:
        story.append(bullet(item, s["bullet"]))

    story += [p("02  Use a complete prompt", s["h1"]),
              p("A strong prompt supplies the missing context and makes the expected result testable. Include only the pieces that matter for the task.", s["body"])]
    prompt_parts = [
        ("ROLE", "What expertise or point of view should the assistant use?"),
        ("TASK", "What exactly should it do? Use a clear action verb."),
        ("CONTEXT", "Who is the audience? What background or source material matters?"),
        ("FORMAT", "What structure, length, tone, or level of detail do you need?"),
        ("CONSTRAINTS", "What must it include, avoid, preserve, or not assume?"),
        ("CHECK", "What should it flag as uncertain, missing, or requiring verification?"),
    ]
    rows = [[p("PROMPT PART", s["label"]), p("WHAT TO SPECIFY", s["label"])]]
    rows.extend([[p(a, s["label"]), p(b, s["small"])] for a, b in prompt_parts])
    table = Table(rows, colWidths=[1.25 * inch, 5.7 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 9), callout(
        "COPY-AND-ADAPT TEMPLATE",
        "Act as [role]. Help me [task] for [audience]. Context/source material: [relevant details]. Return [format, length, tone]. Follow these constraints: [constraints]. Separate facts from assumptions, flag uncertainty, and list anything I should verify.", s),
        PageBreak(), p("03  Useful prompt patterns", s["h1"])]

    pattern_rows = [
        ("Summarize", "Summarize the material for [audience] in [length]. Organize it as: key message, supporting points, decisions, open questions, and next steps. Do not add facts that are not in the source. Mark gaps."),
        ("Draft", "Draft a [kind of message] to [audience] about [purpose]. Use a [tone] tone, keep it to [length], preserve these facts [facts], and do not promise or imply [constraints]. End with [call to action]."),
        ("Compare", "Compare [options] against [criteria]. Show a table of evidence, benefits, costs, risks, and unknowns. State assumptions separately. Do not choose for me; identify what information would change the comparison."),
        ("Improve", "Review this draft for [criteria]. First list the three most important issues, then provide a revised version. Preserve the meaning and facts. Explain any substantive change: [draft]."),
        ("Plan", "Turn this goal into a practical plan for [timeframe]. Provide steps, owners/roles, dependencies, and a definition of done. Highlight risks and decisions that need human input. Goal/context: [details]."),
    ]
    for title, text in pattern_rows:
        story.extend([p(title, s["h2"]), p(text, s["small"])])

    story += [p("04  Turn a prompt into a workflow", s["h1"]),
              p("For repeatable tasks, make the steps and hand-offs visible. Automate stable, low-risk transformations first; retain approval before external or consequential actions.", s["body"])]
    flow = [[p("1  INPUT", s["label"]), p("2  PREPARE", s["label"]),
             p("3  AI STEP", s["label"]), p("4  CHECK", s["label"]),
             p("5  APPROVE", s["label"]), p("6  RECORD", s["label"])],
            [p("Trigger and source", s["center"]), p("Clean, relevant context", s["center"]),
             p("Bounded transformation", s["center"]), p("Rules + spot check", s["center"]),
             p("Person owns release", s["center"]), p("Outcome and errors", s["center"])]]
    flow_table = Table(flow, colWidths=[1.15 * inch] * 6)
    flow_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [flow_table, Spacer(1, 8)]
    for item in [
        "Begin with one workflow and a clear baseline: time spent, error rate, or turnaround time.",
        "Add a fallback for missing, malformed, low-confidence, or out-of-scope inputs.",
        "Keep an owner, a review step, and a way to correct or stop the workflow.",
    ]:
        story.append(bullet(item, s["bullet"]))

    story += [p("05  Review before you rely", s["h1"]),
              p("Fluent writing is not evidence. Treat AI output as a draft until it passes checks suited to the task.", s["body"])]
    checks = [
        ("Accuracy", "Are names, dates, numbers, quotations, and claims correct? Check important claims against trusted sources."),
        ("Coverage", "Did it answer the actual question? What source, perspective, or exception may be missing?"),
        ("Fit", "Is the tone, audience, format, and level of detail appropriate?"),
        ("Risk", "Did you share only permitted data? Could bias, privacy, or reputational harm result?"),
        ("Ownership", "Has the right person reviewed it and accepted responsibility for the action or decision?"),
    ]
    for title, text in checks:
        story.append(bullet(f"<b>{title}:</b> {text}", s["bullet"]))
    story += [Spacer(1, 5), callout(
        "RESPONSIBLE-USE STOP CHECK",
        "Before entering information, ask: Is this tool approved? Is the data allowed here? Could this output influence a person, money, safety, rights, or a formal decision? If yes, use the approved process and required human review.", s, TEAL)]
    HandoutDocTemplate(OUTPUT_DIR / "AI_for_Working_Professionals_Quick_Reference.pdf",
                       "AI at Work: Quick Reference").build(story)


ACTIVITIES = [
    {
        "module": "01 / FOUNDATIONS",
        "title": "Find a task worth improving",
        "time": "12 minutes",
        "purpose": "Choose a real work task where AI can help without handing over an important judgment.",
        "steps": [
            "List three recurring tasks from your week. Include how often each happens, how long it takes, and what makes it difficult.",
            "Score each task from 1 to 5 for repeatability, clarity of inputs, and ease of checking the result. Score risk from 1 to 5, where 5 is high risk.",
            "Choose one task with clear inputs, a checkable output, and manageable risk. Describe how AI would assist and what stays human-owned.",
        ],
        "deliverable": "A one-sentence use case and a measurable success test (for example, reduce first-draft time by 20% without increasing corrections).",
        "prompts": ["Task and frequency", "Current effort or friction", "Inputs and desired output", "Risk / consequence if wrong", "AI assist vs. human-owned step", "Success measure"],
    },
    {
        "module": "01 / FOUNDATIONS",
        "title": "Audit an AI answer",
        "time": "15 minutes",
        "purpose": "Practice separating a useful draft from a trustworthy, decision-ready answer.",
        "steps": [
            "Ask an approved AI tool to summarize a short, non-sensitive work document or create a draft from a brief you provide.",
            "Mark each specific claim as supported by the source, an interpretation, or unsupported. Check names, dates, numbers, and any quotation.",
            "Rewrite the output so supported facts are clear, assumptions are labeled, and missing evidence is called out. Decide whether it is safe to share.",
        ],
        "deliverable": "A corrected summary plus at least two checks you performed before relying on it.",
        "prompts": ["Source or task used", "Claim to verify", "Evidence / source checked", "Correction or uncertainty", "Would you share it? Why?"],
    },
    {
        "module": "02 / PROMPTING FOR WORK",
        "title": "Build a structured prompt",
        "time": "15 minutes",
        "purpose": "Translate a vague request into instructions that produce a usable first draft.",
        "steps": [
            "Choose a routine task such as drafting a project update, preparing an agenda, or summarizing a public article. Do not include confidential information.",
            "Write a prompt with role, task, audience/context, output format, constraints, and a check for assumptions or uncertainty.",
            "Run it once. Compare the result with your intended use, then revise one prompt element and run it again.",
        ],
        "deliverable": "A reusable prompt and one note describing how the revision improved the output.",
        "prompts": ["Original task", "Role and task", "Audience / context", "Format and constraints", "What should be flagged or checked?", "Revision and observed difference"],
    },
    {
        "module": "02 / PROMPTING FOR WORK",
        "title": "Make an executive-ready brief",
        "time": "18 minutes",
        "purpose": "Use structured prompting to turn source material into a concise, audience-aware communication.",
        "steps": [
            "Use a short, non-sensitive project update, meeting notes, or a public text. Identify the audience and the decision or action they need to take.",
            "Ask the AI to produce a brief with: key message, three evidence-based points, risks or unknowns, and a clear next step. Specify a word limit and tone.",
            "Trace each factual statement back to the source. Remove unsupported claims and revise anything that obscures the decision.",
        ],
        "deliverable": "A brief that fits the audience and word limit, with unsupported claims removed or marked for checking.",
        "prompts": ["Audience and needed action", "Source material", "Word limit / tone", "Unsupported or missing claims", "Final next step"],
    },
    {
        "module": "03 / WORKFLOW AUTOMATION",
        "title": "Map a meeting follow-up workflow",
        "time": "18 minutes",
        "purpose": "Design a repeatable AI-assisted workflow while keeping review and approval visible.",
        "steps": [
            "Map how meeting notes become a useful follow-up today: trigger, source, cleanup, summary, action items, review, distribution, and storage.",
            "Mark the steps AI could assist with, such as grouping topics or drafting action items. Specify the required input and expected output at each step.",
            "Add a human checkpoint before anything is sent, plus a fallback for unclear owners, missing deadlines, or sensitive information.",
        ],
        "deliverable": "A simple workflow with an owner, approval point, failure path, and one measure of success.",
        "prompts": ["Trigger and source", "AI-assisted steps", "Input / output", "Human reviewer and approval", "Failure or exception path", "Measure and baseline"],
    },
    {
        "module": "03 / WORKFLOW AUTOMATION",
        "title": "Prototype a reusable document workflow",
        "time": "20 minutes",
        "purpose": "Turn one repeated document task into a small, testable workflow instead of automating everything at once.",
        "steps": [
            "Select a low-risk, repeated task: for example, turning a public announcement into a team summary or formatting recurring status updates.",
            "Define a standard input template, the AI transformation, output format, and a short acceptance checklist. Include how missing inputs should be handled.",
            "Test the workflow with two different sample inputs. Record where the output needs correction and update the template or check accordingly.",
        ],
        "deliverable": "A documented mini-workflow, acceptance checklist, and one limitation discovered in testing.",
        "prompts": ["Task and boundary", "Standard input fields", "Transformation prompt", "Expected output", "Acceptance checklist", "Test 1 / test 2 corrections"],
    },
    {
        "module": "04 / RESPONSIBLE USE",
        "title": "Do a data-sensitivity check",
        "time": "12 minutes",
        "purpose": "Recognize when work context or personal information must not be pasted into an AI tool.",
        "steps": [
            "Consider this scenario: you want an AI tool to summarize customer feedback that includes names, email addresses, account details, and complaints.",
            "Identify sensitive or identifying fields. Check the organization’s approved-tool and data-handling rules; do not enter real customer records during this exercise.",
            "Design a safer route: use an approved environment, remove or aggregate identifiers where permitted, limit the input, and retain a human review step.",
        ],
        "deliverable": "A go / no-go decision with the data risks, policy check, and safer alternative recorded.",
        "prompts": ["What data is present?", "Who could be identified or affected?", "Which policy / tool must be checked?", "Minimum safe input", "Approval / review needed"],
    },
    {
        "module": "04 / RESPONSIBLE USE",
        "title": "Set guardrails for a decision-support draft",
        "time": "18 minutes",
        "purpose": "Keep human accountability and appropriate safeguards in place when AI output may affect people.",
        "steps": [
            "Scenario: a manager asks AI to rank employees for promotion using performance notes. Decide whether this is an appropriate task for an ordinary AI assistant and explain why.",
            "Identify risks such as sensitive data exposure, biased or incomplete records, hidden criteria, and false confidence. Name who is accountable for the decision.",
            "Redesign the use, if appropriate, as a lower-risk support task (for example, checking a transparent set of role criteria for completeness) with approved tools, documented evidence, and human review. Otherwise, stop and escalate.",
        ],
        "deliverable": "A documented stop / redesign decision, a list of safeguards, and the human decision owner.",
        "prompts": ["Potential impact on people", "Risks and missing context", "Allowed support task (if any)", "Safeguards / evidence", "Decision owner and escalation route"],
    },
]


def activity_page(activity, index, s):
    story = [p(activity["module"], s["eyebrow"]),
             p(f"Activity {index:02d}  |  {activity['title']}", s["title"]),
             p(f"Time: {activity['time']}  ·  Work individually or in pairs", s["subtitle"]),
             p("Purpose", s["h2"]), p(activity["purpose"], s["body"]),
             p("Instructions", s["h2"])]
    for step_index, step in enumerate(activity["steps"], 1):
        story.append(p(f"<b>{step_index}.</b> {step}", s["body"]))
    story += [callout("YOUR DELIVERABLE", activity["deliverable"], s, TEAL),
              Spacer(1, 10), p("Work notes", s["h2"])]
    rows = []
    for label in activity["prompts"]:
        rows.append([p(label, s["label"]), ""])
    notes = Table(rows, colWidths=[2.0 * inch, 4.95 * inch],
                  rowHeights=[0.47 * inch] * len(rows))
    notes.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), PALE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [notes, Spacer(1, 8),
              p("Reflection", s["h2"]),
              p("What would you change before using this approach in your real work? What should remain a human responsibility?", s["small"]),
              Spacer(1, 5),
              Table([["", ""]], colWidths=[3.47 * inch, 3.47 * inch], rowHeights=[0.45 * inch],
                    style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE)]))]
    return story


def make_activity_sheet(s):
    story = heading_block(
        "Workshop workbook / 02",
        "AI at Work: Activity Sheet",
        "Eight practical activities across the four workshop topics. Use approved AI tools only, and do not enter confidential or personal information into an unapproved system.",
        s,
    )
    story += [callout("HOW TO USE THIS SHEET",
                      "Complete the exercises with a real but non-sensitive work task or with the scenarios provided. Capture decisions and checks, not confidential source material. Activities can be done individually or in pairs.", s, TEAL),
              Spacer(1, 14), p("Activity map", s["h1"])]
    for n, activity in enumerate(ACTIVITIES, 1):
        story.append(bullet(f"<b>{n:02d} · {activity['title']}</b>  ({activity['module'].split(' / ')[0].title()})", s["bullet"]))
    story.append(PageBreak())
    for index, activity in enumerate(ACTIVITIES, 1):
        story.extend(activity_page(activity, index, s))
        if index != len(ACTIVITIES):
            story.append(PageBreak())
    HandoutDocTemplate(OUTPUT_DIR / "AI_for_Working_Professionals_Activity_Sheet.pdf",
                       "AI at Work: Activity Sheet").build(story)


if __name__ == "__main__":
    document_styles = styles()
    make_quick_reference(document_styles)
    make_activity_sheet(document_styles)
    print("Generated quick reference and activity sheet PDFs.")