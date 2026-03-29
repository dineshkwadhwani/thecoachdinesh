const OpenAI = require('openai');
const { isApiCallsEnabled } = require('../../services/configService');
const { loadReportHistory, saveReportHistory, appendStoredReport, getTransformationAssessmentCount, setTransformationAssessmentCount } = require('../../services/reportService');
const { sendTelegramMessage } = require('../../services/notificationService');

const TRANSFORMATION_SOURCE_QUIZ_TYPES = new Set(['quick', 'deep', 'clarity', 'presence', 'systems']);

/**
 * Format date with day offset
 */
function formatDateOffset(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Get a preview of report text
 */
function getReportPreview(text, maxLength = 220) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

/**
 * Get assessment reports by mobile from history
 */
function getAssessmentReportsByMobile(history, mobile) {
    const normalizedMobile = String(mobile || '').replace(/\s+/g, '');
    const sourceReports = [];

    Object.values(history || {}).forEach((userRecord) => {
        if (!userRecord || !Array.isArray(userRecord.reports)) {
            return;
        }

        userRecord.reports.forEach((reportEntry) => {
            const entryMobile = String((reportEntry && reportEntry.mobile) || '').replace(/\s+/g, '');
            if (entryMobile !== normalizedMobile) {
                return;
            }

            const quizType = String(reportEntry.quizType || '').trim();
            if (!TRANSFORMATION_SOURCE_QUIZ_TYPES.has(quizType)) {
                return;
            }

            sourceReports.push({
                ...reportEntry,
                quizType,
                name: reportEntry.name || '',
                email: reportEntry.email || '',
                mobile: entryMobile
            });
        });
    });

    sourceReports.sort((firstReport, secondReport) => {
        return new Date(firstReport.timestamp || 0).getTime() - new Date(secondReport.timestamp || 0).getTime();
    });

    const latestByTypeMap = new Map();
    sourceReports.forEach((reportEntry) => {
        latestByTypeMap.set(reportEntry.quizType, reportEntry);
    });

    return {
        sourceReports,
        latestByType: Array.from(latestByTypeMap.values())
    };
}

/**
 * Parse AI JSON object from raw text
 */
function parseAiJsonObject(rawText) {
    const trimmed = String(rawText || '').trim();
    if (!trimmed) {
        return null;
    }

    try {
        return JSON.parse(trimmed);
    } catch (error) {
        const firstBraceIndex = trimmed.indexOf('{');
        const lastBraceIndex = trimmed.lastIndexOf('}');
        if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
            return null;
        }

        const possibleJson = trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
        try {
            return JSON.parse(possibleJson);
        } catch (parseError) {
            return null;
        }
    }
}

/**
 * Get prelisted transformation action items
 */
function getPrelistedTransformationActionItems() {
    return [
        {
            area: 'Strategic Focus',
            keyAction: 'Run a weekly strategic signal-vs-noise review and publish the top three priorities for execution.',
            deliveryMode: 'Self-paced learning',
            benefit: 'Improves focus quality and reduces reactive decision-making.',
            startDate: formatDateOffset(0),
            reviewDate: formatDateOffset(21),
            reviewType: 'Self'
        },
        {
            area: 'Leadership Style Adaptability',
            keyAction: 'Apply one situational leadership shift each week and document outcomes with your team.',
            deliveryMode: 'Coaching',
            benefit: 'Builds flexibility across contexts and improves leadership effectiveness.',
            startDate: formatDateOffset(3),
            reviewDate: formatDateOffset(28),
            reviewType: 'Coach'
        },
        {
            area: 'Executive Presence',
            keyAction: 'Rehearse high-stakes messages using concise framing, confident delivery, and explicit asks.',
            deliveryMode: 'Classroom session',
            benefit: 'Increases influence, authority, and trust with stakeholders.',
            startDate: formatDateOffset(7),
            reviewDate: formatDateOffset(35),
            reviewType: 'Mentor'
        },
        {
            area: 'Systems Diagnosis',
            keyAction: 'Map one recurring business challenge using causes, dependencies, and leverage points.',
            deliveryMode: 'Blended',
            benefit: 'Improves root-cause quality and long-term decision outcomes.',
            startDate: formatDateOffset(10),
            reviewDate: formatDateOffset(40),
            reviewType: 'Peer'
        },
        {
            area: 'Stakeholder Influence',
            keyAction: 'Schedule structured alignment conversations with critical stakeholders every fortnight.',
            deliveryMode: 'Coaching',
            benefit: 'Reduces friction and accelerates strategic execution.',
            startDate: formatDateOffset(14),
            reviewDate: formatDateOffset(45),
            reviewType: 'Blended'
        },
        {
            area: 'Execution Accountability',
            keyAction: 'Maintain a 30-day execution tracker with measurable goals and review checkpoints.',
            deliveryMode: 'Self-paced learning',
            benefit: 'Converts insight into sustained action and visible leadership progress.',
            startDate: formatDateOffset(16),
            reviewDate: formatDateOffset(50),
            reviewType: 'Self + Coach'
        }
    ];
}

/**
 * Build transformation assessment summary
 */
function buildTransformationAssessmentSummary(latestByType, allSourceReports) {
    const reports = allSourceReports || latestByType;
    const styleReport = latestByType.find(entry => entry.quizType === 'deep') || latestByType.find(entry => entry.quizType === 'quick');
    const clarityReport = latestByType.find(entry => entry.quizType === 'clarity');
    const presenceReport = latestByType.find(entry => entry.quizType === 'presence');
    const systemsReport = latestByType.find(entry => entry.quizType === 'systems');

    const takenTests = latestByType
        .map(entry => String(entry.assessmentType || entry.quizType || '').trim())
        .filter(Boolean);

    const countByType = {};
    reports.forEach((entry) => {
        const t = entry.quizType;
        countByType[t] = (countByType[t] || 0) + 1;
    });

    const styleCount = (countByType['deep'] || 0) + (countByType['quick'] || 0);

    return {
        takenTests,
        totalAssessmentsAnalysed: reports.length,
        style: styleReport
            ? {
                taken: true,
                attemptCount: styleCount,
                dominantStyle: String(styleReport.dominantStyle || 'Not clearly identified'),
                secondaryStyle: String(styleReport.secondaryStyle || 'Not clearly identified'),
                summary: getReportPreview(styleReport.summary || styleReport.report || '')
            }
            : { taken: false, attemptCount: 0 },
        clarity: clarityReport
            ? {
                taken: true,
                attemptCount: countByType['clarity'] || 1,
                noiseScore: typeof clarityReport.noiseScore === 'number' ? clarityReport.noiseScore : null,
                summary: getReportPreview(clarityReport.summary || clarityReport.report || '')
            }
            : { taken: false, attemptCount: 0 },
        presence: presenceReport
            ? {
                taken: true,
                attemptCount: countByType['presence'] || 1,
                summary: getReportPreview(presenceReport.summary || presenceReport.report || '')
            }
            : { taken: false, attemptCount: 0 },
        systems: systemsReport
            ? {
                taken: true,
                attemptCount: countByType['systems'] || 1,
                summary: getReportPreview(systemsReport.summary || systemsReport.report || '')
            }
            : { taken: false, attemptCount: 0 }
    };
}

/**
 * Normalize transformation plan from AI output
 */
function normalizeTransformationPlan(rawPlan) {
    const plan = rawPlan && typeof rawPlan === 'object' ? rawPlan : {};
    const defaultLearningMix = [
        'Self-paced learning sprints on communication, strategic framing, and systems mapping.',
        'Structured classroom learning for cross-functional leadership and decision quality.',
        '1-on-1 executive coaching to convert insights into behavior change and accountability.'
    ];
    const prelistedActionItems = getPrelistedTransformationActionItems();

    const rawActionItems = Array.isArray(plan.actionItems) ? plan.actionItems : [];
    const normalizedActionItems = rawActionItems
        .map((item, index) => {
            const safeItem = item && typeof item === 'object' ? item : {};
            return {
                area: String(safeItem.area || '').trim(),
                keyAction: String(safeItem.keyAction || '').trim(),
                deliveryMode: String(safeItem.deliveryMode || 'Self-paced learning').trim(),
                benefit: String(safeItem.benefit || 'Improves consistency, confidence, and quality of leadership decisions.').trim(),
                startDate: String(safeItem.startDate || formatDateOffset(index * 7)).trim(),
                reviewDate: String(safeItem.reviewDate || formatDateOffset(index * 7 + 28)).trim(),
                reviewType: String(safeItem.reviewType || 'Self + Coach').trim()
            };
        })
        .filter((item) => item.deliveryMode || item.benefit || item.reviewType);

    const mergedActionItems = prelistedActionItems.map((presetItem, index) => {
        const aiItem = normalizedActionItems[index] || {};
        return {
            area: presetItem.area,
            keyAction: presetItem.keyAction,
            deliveryMode: String(aiItem.deliveryMode || presetItem.deliveryMode).trim(),
            benefit: String(aiItem.benefit || presetItem.benefit).trim(),
            startDate: String(aiItem.startDate || presetItem.startDate).trim(),
            reviewDate: String(aiItem.reviewDate || presetItem.reviewDate).trim(),
            reviewType: String(aiItem.reviewType || presetItem.reviewType).trim()
        };
    });

    const extraActionItems = normalizedActionItems
        .slice(prelistedActionItems.length)
        .filter((item) => item.area && item.keyAction);

    return {
        executiveSummary: String(plan.executiveSummary || 'Your transformation plan is based on your completed assessments and focuses on practical behavior change.').trim(),
        industryComparison: String(plan.industryComparison || 'Compared with high-performing industry leaders, your current profile shows strengths with specific opportunities to accelerate impact.').trim(),
        optimalBehaviours: String(plan.optimalBehaviours || 'Most effective leaders demonstrate clarity under pressure, visible executive presence, systems-level decision making, and disciplined follow-through.').trim(),
        gapAnalysis: String(plan.gapAnalysis || 'The key leadership gaps are inconsistent strategic filtering, uneven executive influence in high-stakes forums, and limited system-level diagnosis under pressure.').trim(),
        coachingAcceleration: String(plan.coachingAcceleration || 'Focused coaching and strategic sessions can accelerate your progress by turning these gaps into repeatable strengths with targeted practice and accountability.').trim(),
        learningMix: Array.isArray(plan.learningMix) && plan.learningMix.length > 0
            ? plan.learningMix.map(item => String(item || '').trim()).filter(Boolean)
            : defaultLearningMix,
        actionItems: [...mergedActionItems, ...extraActionItems]
    };
}

/**
 * Build transformation report text
 */
function buildTransformationReportText(plan, assessmentSummary = {}) {
    const actionLines = (plan.actionItems || [])
        .map((item, index) => `${index + 1}. ${item.area}: ${item.keyAction} | Mode: ${item.deliveryMode} | Benefit: ${item.benefit} | Start: ${item.startDate} | Review: ${item.reviewDate} | Review Type: ${item.reviewType}`)
        .join('\n');

    const testsTakenLine = Array.isArray(assessmentSummary.takenTests) && assessmentSummary.takenTests.length > 0
        ? assessmentSummary.takenTests.join(', ')
        : 'No prior assessments listed';

    return [
        'Executive Summary',
        plan.executiveSummary,
        '',
        'Consolidated Assessment Summary',
        `Tests Taken: ${testsTakenLine}`,
        `Style: ${assessmentSummary.style && assessmentSummary.style.taken ? `${assessmentSummary.style.dominantStyle || 'N/A'} (Secondary: ${assessmentSummary.style.secondaryStyle || 'N/A'})` : 'Not available'}`,
        `Clarity: ${assessmentSummary.clarity && assessmentSummary.clarity.taken ? `Noise Score ${assessmentSummary.clarity.noiseScore ?? 'N/A'}%` : 'Not available'}`,
        `Presence Summary: ${assessmentSummary.presence && assessmentSummary.presence.taken ? assessmentSummary.presence.summary || 'Available' : 'Not available'}`,
        `Systems Summary: ${assessmentSummary.systems && assessmentSummary.systems.taken ? assessmentSummary.systems.summary || 'Available' : 'Not available'}`,
        '',
        'Industry Benchmark Comparison',
        plan.industryComparison,
        '',
        'Most Optimal Behaviours',
        plan.optimalBehaviours,
        '',
        'Gap Analysis',
        plan.gapAnalysis,
        '',
        'How Coaching Accelerates Growth',
        plan.coachingAcceleration,
        '',
        'Recommended Learning Mix',
        ...(plan.learningMix || []),
        '',
        'Action Plan Table',
        actionLines
    ].join('\n');
}

/**
 * Create fallback transformation plan
 */
function createFallbackTransformationPlan(name, sourceDigest = []) {
    const hasStyle = sourceDigest.some(entry => entry.quizType === 'quick' || entry.quizType === 'deep');
    const hasClarity = sourceDigest.some(entry => entry.quizType === 'clarity');
    const hasPresence = sourceDigest.some(entry => entry.quizType === 'presence');
    const hasSystems = sourceDigest.some(entry => entry.quizType === 'systems');

    const focusAreas = [];
    if (hasStyle) focusAreas.push('Leadership style agility');
    if (hasClarity) focusAreas.push('Strategic clarity under noise');
    if (hasPresence) focusAreas.push('Executive presence and influence');
    if (hasSystems) focusAreas.push('Systems thinking and leverage awareness');
    if (!focusAreas.length) focusAreas.push('Integrated leadership execution');

    return normalizeTransformationPlan({
        executiveSummary: `${name}'s transformation plan is built from previously completed assessments and focuses on measurable behavior change across ${focusAreas.join(', ')}.`,
        gapAnalysis: 'Primary gaps include fragmented prioritization under pressure, inconsistent executive influence in critical forums, and limited use of systems-level diagnosis to prevent recurring issues.',
        coachingAcceleration: 'A focused coaching journey with strategic review sessions can shorten the learning curve by converting these gaps into practical leadership habits with feedback and accountability.',
        industryComparison: 'Industry-leading executives show consistency in strategic prioritization, influence quality, and cross-system decision-making. The current profile indicates strengths with clear improvement opportunities that can be closed through disciplined execution.',
        optimalBehaviours: 'Optimal leadership behavior combines clear strategic filters, visible executive communication, thoughtful systems-level diagnosis, and structured review rhythms that convert insight into outcomes.',
        learningMix: [
            'Self-paced learning: Weekly practice modules for strategic framing, communication discipline, and decision hygiene.',
            'Classroom session: Monthly cohort workshop on influence, stakeholder alignment, and high-stakes leadership communication.',
            'Coaching: Fortnightly 1-on-1 sessions for reflection, accountability, and targeted behavior correction.'
        ],
        actionItems: getPrelistedTransformationActionItems()
    });
}

/**
 * Handle POST /analyze-transformation
 */
async function handleTransformationAnalysis(req, res) {
    try {
        const name = String(req.body && req.body.name || '').trim();
        const normalizedPhone = String(req.body && req.body.phone || '').replace(/\s+/g, '');
        const namePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;

        if (!name || !namePattern.test(name) || !/^\+\d{7,15}$/.test(normalizedPhone)) {
            return res.status(400).json({ error: 'Valid name and mobile number are required.' });
        }

        const history = loadReportHistory();
        const { sourceReports, latestByType } = getAssessmentReportsByMobile(history, normalizedPhone);

        if (!sourceReports.length) {
            return res.status(404).json({
                error: 'No prior evaluations were found for this number. Please complete at least one evaluation in Clarity, Style, Presence, or Systems Thinking.'
            });
        }

        // Check if transformation report already exists using summary
        const summaryCount = getTransformationAssessmentCount(normalizedPhone);
        if (summaryCount !== null && summaryCount === sourceReports.length) {
            return res.json({
                alreadyCreated: true,
                name,
                phone: normalizedPhone
            });
        }

        // Build digest from all source reports
        const allReportsDigest = sourceReports.map((reportEntry) => {
            return {
                quizType: reportEntry.quizType,
                assessmentType: reportEntry.assessmentType || reportEntry.quizType,
                timestamp: reportEntry.timestamp,
                dominantStyle: reportEntry.dominantStyle || '',
                secondaryStyle: reportEntry.secondaryStyle || '',
                noiseScore: typeof reportEntry.noiseScore === 'number' ? reportEntry.noiseScore : null,
                summary: getReportPreview(reportEntry.summary || reportEntry.report || '', 200)
            };
        });

        // Group by quiz type
        const reportsByType = {};
        allReportsDigest.forEach((entry) => {
            if (!reportsByType[entry.quizType]) {
                reportsByType[entry.quizType] = [];
            }
            reportsByType[entry.quizType].push(entry);
        });

        const typeSummaryLine = Object.entries(reportsByType)
            .map(([type, entries]) => `${type}: ${entries.length}`)
            .join(', ');

        let globalIndex = 0;
        const sourceText = Object.entries(reportsByType).map(([type, entries]) => {
            const header = `=== ${type.toUpperCase()} — ${entries.length} attempt(s) ===`;
            const lines = entries.map((entry) => {
                globalIndex++;
                const parts = [
                    `${globalIndex}. [${entry.timestamp || 'N/A'}]`,
                    entry.dominantStyle ? `DominantStyle: ${entry.dominantStyle}` : null,
                    entry.secondaryStyle ? `SecondaryStyle: ${entry.secondaryStyle}` : null,
                    entry.noiseScore != null ? `NoiseScore: ${entry.noiseScore}` : null,
                    entry.summary ? `Summary: ${entry.summary}` : null
                ].filter(Boolean);
                return parts.join(' | ');
            });
            return [header, ...lines].join('\n');
        }).join('\n\n');

        const assessmentSummary = buildTransformationAssessmentSummary(latestByType, sourceReports);

        const systemPrompt = `You are an elite executive leadership coach with deep expertise in pattern recognition across repeated assessments. Build a professional transformation report using ALL provided assessment history.

Analyse the FULL history to:
- Identify consistent strengths and persistent gaps across attempts
- Detect whether the leader is improving, regressing, or stuck in patterns
- Highlight high-frequency themes
- Compare current state against industry-standard high-performing leadership behaviour
- Design practical and measurable development recommendations
- Clearly show how coaching can close identified gaps

This is a coaching conversion report. Make the case for structured coaching powerfully but credibly.

Return valid JSON only, with this exact schema:
{
  "executiveSummary": "string",
  "gapAnalysis": "string",
  "coachingAcceleration": "string",
  "industryComparison": "string",
  "optimalBehaviours": "string",
  "learningMix": ["string", "string", "string"],
  "actionItems": [
    {
      "area": "string",
      "keyAction": "string",
      "deliveryMode": "Self-paced learning|Classroom session|Coaching|Blended",
      "benefit": "string",
      "startDate": "DD-MM-YYYY",
      "reviewDate": "DD-MM-YYYY",
      "reviewType": "Peer|Mentor|Coach|Self|Blended"
    }
  ]
}

Rules:
- Provide between 6 and 10 actionItems.
- The executiveSummary must reference the TOTAL number of assessments and call out any recurring patterns.
- The gapAnalysis must name specific gaps visible across the full history.
- Keep the tone professional, practical, and high credibility.
- Ensure recommendations are specific and behaviour based.
- Do not include markdown. Do not add any text outside JSON.`;

        const userPrompt = `Leader Name: ${name}
Mobile: ${normalizedPhone}
Total assessments on record: ${sourceReports.length} (${typeSummaryLine})

Full Assessment History (chronological within each category):
${sourceText}

Using ALL ${sourceReports.length} assessments above, generate a comprehensive transformation action plan.`;

        // Check if API calls are enabled
        if (!isApiCallsEnabled()) {
            return res.json({
                alreadyCreated: false,
                name,
                generatedAt: new Date().toISOString(),
                sourceReports: latestByType,
                assessmentSummary: buildTransformationAssessmentSummary(latestByType, sourceReports),
                plan: {
                    executiveSummary: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                    gapAnalysis: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                    coachingAcceleration: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                    industryComparison: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                    optimalBehaviours: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                    learningMix: ['API CALL SUCCESSFUL, TEST CALL PREVENTED'],
                    actionItems: []
                }
            });
        }

        let normalizedPlan;
        try {
            const groq = new OpenAI({
                apiKey: process.env.GROQ_API_KEY,
                baseURL: 'https://api.groq.com/openai/v1'
            });

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.3-70b-versatile'
            });

            const aiRawOutput = String(completion.choices[0].message.content || '').trim();
            const aiParsedPlan = parseAiJsonObject(aiRawOutput);
            normalizedPlan = normalizeTransformationPlan(aiParsedPlan || { executiveSummary: aiRawOutput });
        } catch (aiError) {
            console.error('Transformation AI error:', aiError.message);
            normalizedPlan = createFallbackTransformationPlan(name, allReportsDigest);
        }

        const timestamp = new Date().toISOString();
        const primaryEmail = String(
            (latestByType.find(reportEntry => reportEntry.email) || {}).email ||
            `transformation+${normalizedPhone.replace(/\D/g, '')}@thecoachdinesh.local`
        ).trim().toLowerCase();

        appendStoredReport(history, {
            timestamp,
            name,
            email: primaryEmail,
            mobile: normalizedPhone,
            quizType: 'transformation',
            assessmentType: 'Transformation Action Plan',
            summary: normalizedPlan.executiveSummary.slice(0, 220),
            sourceReportCount: sourceReports.length,
            sourceQuizTypes: latestByType.map(reportEntry => reportEntry.quizType),
            assessmentSummary,
            plan: normalizedPlan,
            report: buildTransformationReportText(normalizedPlan, assessmentSummary)
        });
        saveReportHistory(history);

        // Save assessment count for future comparisons
        setTransformationAssessmentCount(normalizedPhone, sourceReports.length);

        const telegramText = `New Lead\nName: ${name}\nPhone: ${normalizedPhone}\nEmail: ${primaryEmail}\nTest: Transformation Action Plan\nTime: ${timestamp}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        res.json({
            name,
            generatedAt: timestamp,
            sourceReports: latestByType,
            assessmentSummary,
            plan: normalizedPlan
        });
    } catch (error) {
        console.error('Transformation analysis error:', error.message);
        res.status(500).json({ error: 'Failed to generate transformation plan' });
    }
}

module.exports = {
    handleTransformationAnalysis
};
