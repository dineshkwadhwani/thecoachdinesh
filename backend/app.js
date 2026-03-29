const path = require('path');

// Load environment variables FIRST, before anything else
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const OpenAI = require('openai');
const { askDinesh } = require('./coachService');

const app = express();
const pageCacheDurationMs = 15 * 60 * 1000;
const ADMIN_AUTH_COOKIE = 'adminAuth';
const REFLECT_YOUR_STYLE_KEY = 'reflectYourStyle';
const STRATEGIC_CLARITY_KEY = 'strategicClarity';
const EXECUTIVE_PRESENCE_KEY = 'executivePresence';
const SYSTEMS_THINKING_KEY = 'systemsThinking';
const REPORT_HISTORY_PATH = path.join(__dirname, 'report-history.json');
const TRANSFORMATION_SUMMARY_PATH = path.join(__dirname, 'transformation-summary.json');
const TRANSFORMATION_SOURCE_QUIZ_TYPES = new Set(['quick', 'deep', 'clarity', 'presence', 'systems']);

// Function to generate today's admin password in ddmmyyyy format
function getTodaysAdminPassword() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}${month}${year}`;
}
const DEFAULT_LEADERSHIP_QUIZ_CONFIG = {
    quizEnabled: true,
    deepInsightEnabled: true,
    quickQuestionCount: 10,
    deepQuestionCount: 25
};
const DEFAULT_STRATEGIC_CLARITY_CONFIG = {
    quizEnabled: true,
    scenarioCount: 5
};
const DEFAULT_EXECUTIVE_PRESENCE_CONFIG = {
    quizEnabled: true,
    scenarioCount: 10
};
const DEFAULT_SYSTEMS_THINKING_CONFIG = {
    quizEnabled: true,
    scenarioCount: 5
};

function normalizeLeadershipQuizConfig(rawConfig = {}) {
    const quickQuestionCount = Number.parseInt(rawConfig.quickQuestionCount, 10);
    const deepQuestionCount = Number.parseInt(rawConfig.deepQuestionCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        deepInsightEnabled: rawConfig.deepInsightEnabled !== false,
        quickQuestionCount: Number.isInteger(quickQuestionCount) && quickQuestionCount > 0
            ? quickQuestionCount
            : DEFAULT_LEADERSHIP_QUIZ_CONFIG.quickQuestionCount,
        deepQuestionCount: Number.isInteger(deepQuestionCount) && deepQuestionCount > 0
            ? deepQuestionCount
            : DEFAULT_LEADERSHIP_QUIZ_CONFIG.deepQuestionCount
    };
}

function normalizeStrategicClarityConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_STRATEGIC_CLARITY_CONFIG.scenarioCount
    };
}

function normalizeExecutivePresenceConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_EXECUTIVE_PRESENCE_CONFIG.scenarioCount
    };
}

function normalizeSystemsThinkingConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_SYSTEMS_THINKING_CONFIG.scenarioCount
    };
}

function loadLeadershipQuizData() {
    const questionsPath = path.join(__dirname, 'src/config/questions.json');
    const configPath = path.join(__dirname, 'src/config/quiz-config.json');
    const messagesPath = path.join(__dirname, 'src/config/messages.json');

    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questions = JSON.parse(questionsData);

    let quizConfig = DEFAULT_LEADERSHIP_QUIZ_CONFIG;
    let configByQuiz = {
        [REFLECT_YOUR_STYLE_KEY]: DEFAULT_LEADERSHIP_QUIZ_CONFIG,
        [STRATEGIC_CLARITY_KEY]: DEFAULT_STRATEGIC_CLARITY_CONFIG,
        [EXECUTIVE_PRESENCE_KEY]: DEFAULT_EXECUTIVE_PRESENCE_CONFIG,
        [SYSTEMS_THINKING_KEY]: DEFAULT_SYSTEMS_THINKING_CONFIG
    };
    let messagesByQuiz = {};

    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const rawConfig = JSON.parse(configData);
        quizConfig = normalizeLeadershipQuizConfig(rawConfig[REFLECT_YOUR_STYLE_KEY]);
        configByQuiz = {
            ...rawConfig,
            [REFLECT_YOUR_STYLE_KEY]: quizConfig,
            [STRATEGIC_CLARITY_KEY]: normalizeStrategicClarityConfig(rawConfig[STRATEGIC_CLARITY_KEY]),
            [EXECUTIVE_PRESENCE_KEY]: normalizeExecutivePresenceConfig(rawConfig[EXECUTIVE_PRESENCE_KEY]),
            [SYSTEMS_THINKING_KEY]: normalizeSystemsThinkingConfig(rawConfig[SYSTEMS_THINKING_KEY])
        };
    }

    if (fs.existsSync(messagesPath)) {
        const messagesData = fs.readFileSync(messagesPath, 'utf-8');
        const rawMessages = JSON.parse(messagesData);
        messagesByQuiz = rawMessages && typeof rawMessages === 'object' ? rawMessages : {};
    }

    return { questions, quizConfig, configByQuiz, messagesByQuiz };
}

function createLeadKey(email, mobile) {
    return `${String(email || '').trim().toLowerCase()}::${String(mobile || '').trim()}`;
}

function loadReportHistory() {
    if (!fs.existsSync(REPORT_HISTORY_PATH)) {
        return { leads: {} };
    }

    try {
        const historyData = fs.readFileSync(REPORT_HISTORY_PATH, 'utf-8');
        const parsedHistory = JSON.parse(historyData);

        return parsedHistory && typeof parsedHistory === 'object' && parsedHistory.leads
            ? parsedHistory
            : { leads: {} };
    } catch (error) {
        console.error('Error loading report history:', error.message);
        return { leads: {} };
    }
}

function saveReportHistory(history) {
    fs.writeFileSync(REPORT_HISTORY_PATH, JSON.stringify(history, null, 2));
}

// Transformation summary: tracks assessment count at time of last plan generation, keyed by phone
function loadTransformationSummary() {
    try {
        if (fs.existsSync(TRANSFORMATION_SUMMARY_PATH)) {
            const data = fs.readFileSync(TRANSFORMATION_SUMMARY_PATH, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
    } catch (error) {
        console.error('Error loading transformation summary:', error.message);
    }
    return {};
}

function saveTransformationSummary(summary) {
    fs.writeFileSync(TRANSFORMATION_SUMMARY_PATH, JSON.stringify(summary, null, 2));
}

function getTransformationAssessmentCount(phone) {
    const summary = loadTransformationSummary();
    const entry = summary[String(phone || '').trim()];
    return entry && typeof entry.assessmentCount === 'number' ? entry.assessmentCount : null;
}

function setTransformationAssessmentCount(phone, count) {
    const summary = loadTransformationSummary();
    summary[String(phone || '').trim()] = {
        assessmentCount: count,
        updatedAt: new Date().toISOString()
    };
    saveTransformationSummary(summary);
}

function getLatestStoredReport(history, email, mobile, quizType) {
    const leadKey = createLeadKey(email, mobile);
    const leadEntry = history.leads[leadKey];

    if (!leadEntry || !Array.isArray(leadEntry.reports)) {
        return null;
    }

    const matchingReports = leadEntry.reports.filter(reportEntry => reportEntry.quizType === quizType);
    return matchingReports.length > 0 ? matchingReports[matchingReports.length - 1] : null;
}

function appendStoredReport(history, reportEntry) {
    const leadKey = createLeadKey(reportEntry.email, reportEntry.mobile);
    const existingLead = history.leads[leadKey] || {
        name: reportEntry.name,
        email: reportEntry.email,
        mobile: reportEntry.mobile,
        reports: []
    };

    existingLead.name = reportEntry.name;
    existingLead.email = reportEntry.email;
    existingLead.mobile = reportEntry.mobile;
    existingLead.reports.push(reportEntry);

    history.leads[leadKey] = existingLead;
}

function getAssessmentReportsByMobile(history, mobile) {
    const normalizedMobile = String(mobile || '').replace(/\s+/g, '');
    const sourceReports = [];

    Object.values(history.leads || {}).forEach((lead) => {
        if (!lead || !Array.isArray(lead.reports)) {
            return;
        }

        lead.reports.forEach((reportEntry) => {
            const entryMobile = String((reportEntry && reportEntry.mobile) || lead.mobile || '').replace(/\s+/g, '');
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
                name: reportEntry.name || lead.name || '',
                email: reportEntry.email || lead.email || '',
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

function formatDateOffset(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function getReportPreview(text, maxLength = 220) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

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
        .filter((item) => item.area && item.keyAction)
        .map((item) => ({
            area: item.area,
            keyAction: item.keyAction,
            deliveryMode: item.deliveryMode,
            benefit: item.benefit,
            startDate: item.startDate,
            reviewDate: item.reviewDate,
            reviewType: item.reviewType
        }));

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

function createFallbackLeadershipReport(name, dominantStyleName, secondaryStyleName, quizType) {
    const secondary = secondaryStyleName ? ` with a secondary tendency towards ${secondaryStyleName}` : '';
    if (quizType === 'deep') {
        return `Name\n${name}\n\nDominant Style\n${name} demonstrates a ${dominantStyleName} leadership style${secondary}. This profile is drawn from your extended response pattern across this diagnostic.\n\nSecondary Style\n${secondaryStyleName ? `A ${secondaryStyleName} tendency emerges as a complementary dimension, offering additional flexibility in varied leadership situations.` : 'No clear secondary style was identified in this assessment.'}\n\nComparison With Earlier Report\nThis deeper assessment confirms the pattern identified in earlier evaluations, providing a more detailed picture of how your style operates across complex scenarios.\n\nStyle Interpretation\nLeaders with a ${dominantStyleName} profile tend to bring a distinctive approach to decision-making, team engagement, and strategic execution. This style is most effective when applied with self-awareness and situational flexibility.\n\nStrengths\nYour ${dominantStyleName} orientation brings clear advantages in terms of consistency, credibility, and the ability to rally your team around a coherent direction.\n\nRisks And Blind Spots\nThe primary risk for ${dominantStyleName} leaders is over-reliance on a single mode of engagement. Expanding your repertoire will improve performance across diverse contexts.\n\nDevelopment Priorities\nFocus on deepening your situational awareness, building range across other leadership modes, and investing in structured coaching to accelerate your leadership growth.`;
    }
    return `${name}, your responses indicate a ${dominantStyleName} leadership style${secondary}. ${dominantStyleName} leaders bring a strong and consistent approach to how they engage with their teams and make decisions. Your key strengths lie in your ability to lead with clarity and conviction. To grow further, consider expanding your flexibility across other leadership modes, particularly in high-pressure or cross-functional contexts. A structured coaching conversation would help you unlock the next level of your leadership impact.`;
}

function createFallbackClarityReport(name, noiseScore, noiseCleared, totalNoise, signalsMissed, totalSignals) {
    const performance = noiseScore >= 70 ? 'strong' : noiseScore >= 50 ? 'developing' : 'emerging';
    return `${name}, your Strategic Clarity Diagnostic reveals a ${performance} ability to filter leadership noise. You correctly identified ${noiseCleared} out of ${totalNoise} noise items (${noiseScore}% accuracy)${signalsMissed > 0 ? `, though ${signalsMissed} critical signal${signalsMissed > 1 ? 's were' : ' was'} missed` : ''}. The most effective leaders develop a disciplined habit of distinguishing signal from noise before acting — and this score gives you a clear baseline to build from. To sharpen your clarity, try a weekly 15-minute signal audit: review your week's decisions and tag each driver as signal or noise in hindsight. A 1-on-1 Clarity Session with Coach Dinesh can help you identify the specific blind spots in your leadership lens and build a personalised framework for clearer, faster decision-making.`;
}

function createFallbackPresenceReport(name, powerMoves) {
    const moveList = Array.isArray(powerMoves) && powerMoves.length > 0
        ? powerMoves.join(', ')
        : 'your selected scenarios';
    return `${name}, your Executive Presence Simulator results show a thoughtful approach to high-stakes leadership moments. Across ${moveList}, your choices reveal how you instinctively frame authority, influence, and credibility under pressure. Strong executive presence is built from consistent, intentional behaviour — and your results highlight both areas of natural strength and specific opportunities to elevate your impact. Leaders who invest in their presence see measurable improvements in stakeholder confidence, team performance, and career trajectory. A 1-on-1 coaching session would help you translate these insights into a targeted presence development plan.`;
}

function createFallbackSystemsReport(name, rankings) {
    const scenarioCount = Array.isArray(rankings) ? rankings.length : 0;
    return `${name}, your Systems Thinking Diagnostic across ${scenarioCount} scenario${scenarioCount !== 1 ? 's' : ''} reveals your current impact hierarchy preferences. The most effective systems thinkers learn to look upstream from symptoms — identifying structural, process, and cultural leverage points rather than reacting to surface-level people or operational issues. Your response pattern provides a valuable baseline. To develop further, practise asking "what system is producing this result?" before acting. Building this habit consistently will significantly extend your strategic influence. A coaching conversation with Coach Dinesh can help you map your specific systems-thinking gaps and design a targeted development path.`;
}


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
        actionItems: [
            {
                area: 'Strategic Focus',
                keyAction: 'Run a weekly strategic signal-vs-noise review and publish top three priorities for execution.',
                deliveryMode: 'Self-paced learning',
                benefit: 'Improves focus quality and reduces reaction-driven decisions.',
                startDate: formatDateOffset(0),
                reviewDate: formatDateOffset(21),
                reviewType: 'Self'
            },
            {
                area: 'Executive Communication',
                keyAction: 'Practice concise executive updates with clear narrative, risk framing, and decision asks.',
                deliveryMode: 'Classroom session',
                benefit: 'Increases leadership credibility and decision velocity with stakeholders.',
                startDate: formatDateOffset(3),
                reviewDate: formatDateOffset(28),
                reviewType: 'Mentor'
            },
            {
                area: 'Influence and Presence',
                keyAction: 'Prepare and rehearse high-stakes conversations using intent, evidence, and confident delivery.',
                deliveryMode: 'Coaching',
                benefit: 'Strengthens authority, trust, and cross-functional influence.',
                startDate: formatDateOffset(7),
                reviewDate: formatDateOffset(35),
                reviewType: 'Coach'
            },
            {
                area: 'Systems Diagnosis',
                keyAction: 'Map one recurring organizational challenge using causes, dependencies, and leverage points.',
                deliveryMode: 'Blended',
                benefit: 'Improves root-cause quality and long-term decision outcomes.',
                startDate: formatDateOffset(10),
                reviewDate: formatDateOffset(40),
                reviewType: 'Peer'
            },
            {
                area: 'Accountability Rhythm',
                keyAction: 'Create a 30-day action tracker with fortnightly reviews and visible progress checkpoints.',
                deliveryMode: 'Coaching',
                benefit: 'Turns insight into consistent execution and sustained change.',
                startDate: formatDateOffset(14),
                reviewDate: formatDateOffset(45),
                reviewType: 'Coach'
            },
            {
                area: 'Team Leadership Maturity',
                keyAction: 'Use structured developmental feedback with each direct report once every two weeks.',
                deliveryMode: 'Self-paced learning',
                benefit: 'Builds team capability and improves leadership bench strength.',
                startDate: formatDateOffset(16),
                reviewDate: formatDateOffset(50),
                reviewType: 'Blended'
            }
        ]
    });
}

function setPageCacheHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=900, must-revalidate');
    res.setHeader('Expires', new Date(Date.now() + pageCacheDurationMs).toUTCString());
}

function parseCookies(req) {
    const cookies = {};
    (req.headers.cookie || '').split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
            cookies[key] = decodeURIComponent(value);
        }
    });
    return cookies;
}

function isAdminAuthenticated(req) {
    const cookies = parseCookies(req);
    return cookies[ADMIN_AUTH_COOKIE] === 'true';
}

function isApiCallsEnabled() {
    try {
        const configPath = path.join(__dirname, 'quiz-config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);
            return config.enableApiCalls !== false;
        }
        return true;
    } catch (error) {
        console.warn('Error checking enableApiCalls flag:', error.message);
        return true;
    }
}

// 1. SERVE STATIC FILES
// This tells Express to serve your CSS, JS, and Images from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend'), {
    index: false,
    maxAge: '15m',
    setHeaders: (res) => {
        setPageCacheHeaders(res);
    }
}));

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/ping', (req, res) => {
  res.status(200).send('Coach is awake!');
});

// CHECK IF A PHONE NUMBER HAS ALREADY TAKEN A SPECIFIC QUIZ
app.get('/check-existing-report', (req, res) => {
    try {
        const phone = String(req.query.phone || '').replace(/\s+/g, '');
        const quizType = String(req.query.quizType || '').trim();

        const validQuizTypes = new Set(['quick', 'deep', 'clarity', 'presence', 'systems']);
        if (!phone || !/^\+\d{7,15}$/.test(phone) || !validQuizTypes.has(quizType)) {
            return res.status(400).json({ error: 'Valid phone and quizType required.' });
        }

        const history = loadReportHistory();
        let found = null;

        Object.values(history.leads || {}).some((lead) => {
            return (lead.reports || []).some((report) => {
                const reportPhone = String((report.mobile || lead.mobile || '')).replace(/\s+/g, '');
                if (reportPhone === phone && report.quizType === quizType) {
                    found = { name: report.name || lead.name || '' };
                    return true;
                }
                return false;
            });
        });

        res.json({ exists: !!found, name: found ? found.name : null });
    } catch (error) {
        console.error('Check existing report error:', error.message);
        res.status(500).json({ error: 'Failed to check report.' });
    }
});

// SEND RETRIEVAL REQUEST (Telegram to coach + WhatsApp for user)
app.post('/request-report-retrieval', async (req, res) => {
    try {
        const name = String(req.body && req.body.name || '').trim();
        const phone = String(req.body && req.body.phone || '').replace(/\s+/g, '');
        const quizType = String(req.body && req.body.quizType || '').trim();

        if (!name || !phone || !quizType) {
            return res.status(400).json({ error: 'name, phone and quizType required.' });
        }

        const quizLabel = {
            quick: 'Leadership Style (Quick)',
            deep: 'Leadership Style (Deep)',
            clarity: 'Strategic Clarity',
            presence: 'Executive Presence',
            systems: 'Systems Thinking',
            transformation: 'Transformation Action Plan'
        }[quizType] || quizType;

        const telegramText = `Report Requested\nName: ${name}\nPhone: ${phone}\nTest: ${quizLabel}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        console.log(`[RETRIEVAL_REQUEST] | Name: ${name} | Phone: ${phone} | Quiz: ${quizType}`);
        res.json({ ok: true });
    } catch (error) {
        console.error('Retrieval request error:', error.message);
        res.status(500).json({ error: 'Failed to send retrieval request.' });
    }
});



// 2. SERVE THE HOME PAGE
// When someone goes to http://localhost:3000, send them your index.html
app.get('/', (req, res) => {
    setPageCacheHeaders(res);
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ADMIN LOGIN PAGE
app.get('/admin', (req, res) => {
    if (isAdminAuthenticated(req)) {
        // Already authenticated, redirect to reports
        return res.redirect('/admin-reports');
    }

    const hasLoginError = String(req.query.error || '') === '1';
    
    // Serve login page
    const loginHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login | Coach Dinesh</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            background: radial-gradient(circle at top left, rgba(74, 144, 226, 0.16), transparent 28%),
                        linear-gradient(180deg, #f5f8fb 0%, #eef3f8 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #24313d;
        }

        .login-container {
            max-width: 420px;
            width: 100%;
            padding: 24px;
        }

        .login-card {
            padding: 40px;
            border: 1px solid rgba(96, 124, 150, 0.18);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(12px);
            box-shadow: 0 18px 60px rgba(38, 61, 89, 0.08);
        }

        .login-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .login-header h1 {
            margin: 0 0 12px;
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            line-height: 1.1;
            color: #17212b;
        }

        .login-header p {
            margin: 0;
            font-size: 14px;
            color: #4d5e6f;
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #4a6177;
        }

        .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid #cfd9e4;
            border-radius: 12px;
            background: #fff;
            font-size: 15px;
            color: #23313d;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #4a90e2;
            box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.14);
        }

        .btn-submit {
            width: 100%;
            padding: 14px 22px;
            border: none;
            border-radius: 999px;
            background: linear-gradient(135deg, #1d5da8 0%, #4a90e2 100%);
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 14px 26px rgba(29, 93, 168, 0.22);
            transition: transform 0.2s ease;
        }

        .btn-submit:hover:not(:disabled) {
            transform: translateY(-2px);
        }

        .btn-submit:disabled {
            cursor: wait;
            opacity: 0.7;
        }

        .error-message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            background: #fef0f0;
            color: #b33b3b;
            font-size: 14px;
            display: none;
        }

        .error-message.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1>Admin Access</h1>
                <p>Enter the password to access reports</p>
            </div>

            <form id="login-form" method="POST" action="/admin-login">
                <div id="error-message" class="error-message ${hasLoginError ? 'show' : ''}">${hasLoginError ? 'Invalid password. Please try again.' : ''}</div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input 
                        type="password" 
                        name="password"
                        id="password" 
                        placeholder="Enter password" 
                        autocomplete="off"
                        required
                    >
                </div>

                <button type="submit" class="btn-submit" id="submit-btn">Access Reports</button>
            </form>
        </div>
    </div>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(loginHTML);
});

// ADMIN LOGIN API
app.post('/admin-login', (req, res) => {
    const password = String(req.body && req.body.password || '').trim();
    const todaysPassword = getTodaysAdminPassword();
    const prefersHtml = (req.headers.accept || '').includes('text/html');
    
    if (!password) {
        if (prefersHtml) {
            return res.redirect('/admin?error=1');
        }
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    if (password === todaysPassword) {
        // Set authentication cookie
        res.setHeader('Set-Cookie', `${ADMIN_AUTH_COOKIE}=true; Path=/; HttpOnly; SameSite=Strict`);
        if (prefersHtml) {
            return res.redirect('/admin-reports');
        }
        return res.json({ success: true, message: 'Authentication successful' });
    }

    if (prefersHtml) {
        return res.redirect('/admin?error=1');
    }
    res.status(401).json({ success: false, message: 'Invalid password' });
});

// ADMIN LOGOUT API
app.post('/admin-logout', (req, res) => {
    res.setHeader('Set-Cookie', `${ADMIN_AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    res.json({ success: true });
});

// 3. THE CHAT API
app.post('/chat', async (req, res) => {

    console.log("1. Backend received a request:", req.body.message);
    try {
        const { message } = req.body;
        const response = await askDinesh(message);

        console.log("2. AI responded successfully!");
        res.json({ reply: response });
    } catch (error) {
        console.error("X:post/chat: ERROR:", error.message);
        console.error("AI Error:", error);
        res.status(500).json({ reply: "I'm having trouble connecting to my thoughts. Try again?" });
    }
});

async function sendTelegramMessage(text) {
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramToken || !telegramChatId) {
        throw new Error('TELEGRAM_TOKEN or TELEGRAM_CHAT_ID is not configured');
    }

    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
        response = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                chat_id: telegramChatId,
                text
            })
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Telegram API error: ${response.status} ${errorBody}`);
    }
}

app.post('/notify-onboarding', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'name and phone are required' });
        }

        const text = `✅ New verified chatbot lead\nName: ${name}\nPhone: ${phone}`;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Telegram notification message:\n${text}`);
        await sendTelegramMessage(text);

        res.json({ success: true });
    } catch (error) {
        console.error('Telegram notification error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send Telegram notification' });
    }
});

// 4. GET LEADERSHIP QUIZ QUESTIONS
app.get('/get-questions', (req, res) => {
    try {
        const { questions, configByQuiz, messagesByQuiz } = loadLeadershipQuizData();
        res.json({
            ...questions,
            config: configByQuiz,
            messages: messagesByQuiz
        });
    } catch (error) {
        console.error('Error loading questions:', error.message);
        res.status(500).json({ error: 'Failed to load questions' });
    }
});

// ADMIN REPORTS PAGE - Protected
app.get('/admin-reports', (req, res) => {
    if (!isAdminAuthenticated(req)) {
        return res.redirect('/admin');
    }
    
    res.sendFile(path.join(__dirname, '../frontend/admin-reports.html'));
});

// Protected Leadership Reports Endpoints
app.get('/leadership-reports/all', (req, res) => {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    try {
        const history = loadReportHistory();
        const allLeads = Object.values(history.leads || {});
        const allReports = allLeads.flatMap(lead =>
            (lead.reports || []).map(reportEntry => ({
                ...reportEntry,
                name: lead.name,
                email: lead.email,
                mobile: lead.mobile
            }))
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json({ reports: allReports, total: allReports.length });
    } catch (error) {
        console.error('Error retrieving all leadership reports:', error.message);
        res.status(500).json({ error: 'Failed to retrieve reports' });
    }
});

app.get('/leadership-reports', (req, res) => {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    try {
        const email = String(req.query.email || '').trim();
        const mobile = String(req.query.mobile || '').replace(/\s+/g, '');

        if (!email || !/^\+\d{7,15}$/.test(mobile)) {
            return res.status(400).json({ error: 'email and valid mobile are required' });
        }

        const history = loadReportHistory();
        const leadKey = createLeadKey(email, mobile);
        const leadEntry = history.leads[leadKey];
        const reports = leadEntry && Array.isArray(leadEntry.reports)
            ? leadEntry.reports.map(reportEntry => ({
                ...reportEntry,
                name: reportEntry.name || leadEntry.name,
                email: reportEntry.email || leadEntry.email,
                mobile: reportEntry.mobile || leadEntry.mobile
            }))
            : [];

        res.json({
            reports
        });
    } catch (error) {
        console.error('Error retrieving leadership reports:', error.message);
        res.status(500).json({ error: 'Failed to retrieve leadership reports' });
    }
});

app.delete('/leadership-reports', (req, res) => {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    try {
        const requestedReports = Array.isArray(req.body && req.body.reports)
            ? req.body.reports
            : [];

        if (requestedReports.length === 0) {
            return res.status(400).json({ error: 'At least one report identifier is required' });
        }

        const history = loadReportHistory();
        let deletedCount = 0;

        requestedReports.forEach((reportIdentifier) => {
            const email = String(reportIdentifier && reportIdentifier.email || '').trim().toLowerCase();
            const mobile = String(reportIdentifier && reportIdentifier.mobile || '').replace(/\s+/g, '');
            const timestamp = String(reportIdentifier && reportIdentifier.timestamp || '').trim();
            const quizType = String(reportIdentifier && reportIdentifier.quizType || '').trim();

            if (!email || !/^\+\d{7,15}$/.test(mobile) || !timestamp || !quizType) {
                return;
            }

            const leadKey = createLeadKey(email, mobile);
            const leadEntry = history.leads[leadKey];
            if (!leadEntry || !Array.isArray(leadEntry.reports)) {
                return;
            }

            const originalCount = leadEntry.reports.length;
            leadEntry.reports = leadEntry.reports.filter((reportEntry) => {
                return !(reportEntry.timestamp === timestamp && reportEntry.quizType === quizType);
            });

            deletedCount += originalCount - leadEntry.reports.length;

            if (leadEntry.reports.length === 0) {
                delete history.leads[leadKey];
            } else {
                history.leads[leadKey] = leadEntry;
            }
        });

        saveReportHistory(history);
        res.json({ deletedCount });
    } catch (error) {
        console.error('Error deleting leadership reports:', error.message);
        res.status(500).json({ error: 'Failed to delete reports' });
    }
});

// 5. ANALYZE LEADERSHIP STYLE
app.post('/analyze-leadership', async (req, res) => {
    try {
        const { quizConfig } = loadLeadershipQuizData();
        const { name, mobile, email, answers, quizType } = req.body;
        const answerCount = Array.isArray(answers) ? answers.length : 0;
        const normalizedMobile = typeof mobile === 'string' ? mobile.replace(/\s+/g, '') : '';
        const isValidMobile = /^\+\d{7,15}$/.test(normalizedMobile);
        const validAnswerCounts = [...new Set([quizConfig.quickQuestionCount, quizConfig.deepQuestionCount])];
        const normalizedQuizType = quizType === 'deep' ? 'deep' : 'quick';
        const history = loadReportHistory();
        const previousQuickReport = normalizedQuizType === 'deep'
            ? getLatestStoredReport(history, email, normalizedMobile, 'quick')
            : null;

        if (!name || !email || !isValidMobile || !Array.isArray(answers) || !validAnswerCounts.includes(answerCount)) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Check if API calls are enabled
        if (!isApiCallsEnabled()) {
            return res.json({
                name,
                dominantStyle: 'Style Analysis',
                secondaryStyle: 'Secondary Style',
                report: 'API CALL SUCCESSFUL, TEST CALL PREVENTED'
            });
        }

        // Count answers to determine dominant style
        const styleCounts = { A: 0, B: 0, C: 0, D: 0 };
        answers.forEach(answer => {
            styleCounts[answer]++;
        });

        // Map to leadership styles
        // A = Visionary, B = Coaching, C = Democratic, D = Pacesetter
        const styleMap = { A: 'Visionary', B: 'Coaching', C: 'Democratic', D: 'Pacesetter' };
        const rankedStyles = Object.entries(styleCounts)
            .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1]);
        const dominantStyle = rankedStyles[0][0];
        const dominantStyleName = styleMap[dominantStyle];
        const secondaryStyle = rankedStyles[1] && rankedStyles[1][1] > 0 ? rankedStyles[1][0] : null;
        const secondaryStyleName = secondaryStyle ? styleMap[secondaryStyle] : null;

        // Build prompt for Groq AI
        const answersText = answers.map((ans, i) => `Q${i+1}: ${ans}`).join(' | ');
        const styleBreakdownText = rankedStyles
            .map(([styleKey, count]) => `${styleMap[styleKey]}=${count}`)
            .join(', ');
        const previousReportContext = normalizedQuizType === 'deep' && previousQuickReport
            ? `Previous quick report summary: ${previousQuickReport.report}\nPrevious dominant style: ${previousQuickReport.dominantStyle || 'Not provided'}\nPrevious secondary style: ${previousQuickReport.secondaryStyle || 'Not provided'}`
            : 'Previous quick report summary: Not available';

        const systemPrompt = normalizedQuizType === 'deep'
            ? `You are an executive leadership coach creating a professional, detailed, and insightful leadership assessment. Analyze these ${answerCount} answers for ${name}. The answer choices represent: A=Visionary, B=Coaching, C=Democratic, D=Pacesetter.

Write a 350-500 word report in clear professional language using "you" and "your" throughout. Make the tone polished, credible, and practical.

Your report must:
1) Open by naming the person as ${name}
2) Clearly state the dominant leadership style
3) Mention the secondary leadership style if one exists and explain how it complements or creates tension with the dominant style
4) If a previous quick report is available, compare this deeper analysis with it and explain whether it confirms, sharpens, or changes the earlier picture
5) Explain what this leadership style means in practice and how leaders with this style typically operate
6) Include balanced pros and cons of the dominant style
7) Include literature-informed perspective using generally accepted leadership ideas and established leadership language, without inventing fake citations or specific books unless you are certain
8) Provide concrete developmental advice for becoming more effective as a leader

Structure the report with these headings exactly:
Name
Dominant Style
Secondary Style
Comparison With Earlier Report
Style Interpretation
Strengths
Risks And Blind Spots
Development Priorities

Do not include markdown bullets. Use short paragraphs under each heading. Do not mention answer letters.`
            : `You are an executive leadership coach providing personalized feedback. Analyze these ${answerCount} leadership assessment answers for ${name}. The answer choices represent: A=Visionary, B=Coaching, C=Democratic, D=Pacesetter. Provide a 170-230 word report in second person that:
1) Identifies your dominant leadership style and explains what it means
2) Mentions your secondary style if there is one
3) Describes your strengths in this style
4) Suggests areas where you can grow and develop

Use "you" and "your" throughout. Be warm, encouraging, and actionable.`;

        const userPrompt = normalizedQuizType === 'deep'
            ? `Analyze these answers: ${answersText}

Name: ${name}
Quiz type: ${normalizedQuizType}
Dominant Style Indicated: ${dominantStyleName}
Secondary Style Indicated: ${secondaryStyleName || 'None'}
Style breakdown: ${styleBreakdownText}
${previousReportContext}`
            : `Analyze these answers (A-D represent answer choices): ${answersText}

Name: ${name}
Quiz type: ${normalizedQuizType}
Dominant Style Indicated: ${dominantStyleName}
Secondary Style Indicated: ${secondaryStyleName || 'None'}
Style breakdown: ${styleBreakdownText}`;
        
        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        let aiReport;
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                model: "llama-3.3-70b-versatile",
            });
            aiReport = completion.choices[0].message.content;
        } catch (aiError) {
            console.error('Leadership AI fallback activated:', aiError.message);
            aiReport = createFallbackLeadershipReport(name, dominantStyleName, secondaryStyleName, normalizedQuizType);
        }
        const timestamp = new Date().toISOString();

        appendStoredReport(history, {
            timestamp,
            name,
            email,
            mobile: normalizedMobile,
            quizType: normalizedQuizType,
            dominantStyle: dominantStyleName,
            secondaryStyle: secondaryStyleName,
            report: aiReport
        });
        saveReportHistory(history);

        // Log in the required format (summary only, not full report)
        const reportSummary = String(aiReport || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        const logMessage = `[REPORT_GENERATE] | Timestamp: ${timestamp} | Name: ${name} | Mobile: ${normalizedMobile} | Email: ${email} | QuizType: ${normalizedQuizType} | DominantStyle: ${dominantStyleName} | SecondaryStyle: ${secondaryStyleName || 'None'} | ReportSummary: ${reportSummary}`;
        console.log(logMessage);

        // Send Telegram notification
        const quizTypeLabel = normalizedQuizType === 'deep' ? 'Leadership Style (Deep)' : 'Leadership Style (Quick)';
        const telegramText = `New Lead\nName: ${name}\nPhone: ${normalizedMobile}\nEmail: ${email}\nTest: ${quizTypeLabel}\nTime: ${timestamp}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        // Return the report to frontend
        console.log(`[REPORT_SEND] Sending response to frontend for ${name} (${normalizedQuizType})`);
        res.json({
            name,
            dominantStyle: dominantStyleName,
            secondaryStyle: secondaryStyleName,
            report: aiReport
        });
        console.log(`[REPORT_DONE] Response sent successfully for ${name}`);

    } catch (error) {
        console.error('Leadership analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze leadership style' });
    }
});

// 6. ANALYZE CLARITY DIAGNOSTIC
app.post('/analyze-clarity', async (req, res) => {
    try {
        const { name, phone, email, noiseCleared, signalsMissed, totalNoise, totalSignals, noiseScore } = req.body;

        const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
        const isValidPhone = /^\+\d{7,15}$/.test(normalizedPhone);

        if (!name || !email || !isValidPhone ||
            typeof noiseCleared !== 'number' || typeof signalsMissed !== 'number') {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Check if API calls are enabled
        if (!isApiCallsEnabled()) {
            return res.json({
                name,
                noiseScore,
                noiseCleared,
                signalsMissed,
                totalNoise,
                totalSignals,
                report: 'API CALL SUCCESSFUL, TEST CALL PREVENTED'
            });
        }

        const systemPrompt = `You are an executive leadership coach. Provide a focused, honest 180-word report on a leader's ability to filter strategic noise. Use "you" and "your" throughout. Be warm, credible and actionable.`;

        const userPrompt = `Analyze ${name}'s ability to filter noise in the Strategic Clarity Diagnostic.
They correctly cleared ${noiseCleared} out of ${totalNoise} pieces of noise (${noiseScore}% noise accuracy).
They mistakenly dismissed ${signalsMissed} critical signals out of ${totalSignals} total signals as distractions.

Write approximately 180 words covering:
1) Their overall Strategic Focus capability
2) What their signal/noise accuracy reveals about their current leadership lens
3) Specific risks if they continue to miss those critical signals
4) One practical habit or mental model to sharpen their clarity

End with a natural invitation to a 1-on-1 Clarity Session to explore their blindspots further.`;

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });

        let aiReport;
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user',   content: userPrompt }
                ],
                model: 'llama-3.3-70b-versatile'
            });
            aiReport = completion.choices[0].message.content;
        } catch (aiError) {
            console.error('Clarity AI fallback activated:', aiError.message);
            aiReport = createFallbackClarityReport(name, noiseScore, noiseCleared, totalNoise, signalsMissed, totalSignals);
        }

        const timestamp = new Date().toISOString();
        const history = loadReportHistory();

        appendStoredReport(history, {
            timestamp,
            name,
            email,
            mobile: normalizedPhone,
            quizType: 'clarity',
            assessmentType: 'Strategic Clarity',
            noiseScore,
            noiseCleared,
            signalsMissed,
            totalNoise,
            totalSignals,
            report: aiReport
        });
        saveReportHistory(history);

        const reportSummary = String(aiReport || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        console.log(`[CLARITY_GENERATE] | Timestamp: ${timestamp} | Name: ${name} | Phone: ${normalizedPhone} | Email: ${email} | NoiseScore: ${noiseScore}% | NoiseCleared: ${noiseCleared}/${totalNoise} | SignalsMissed: ${signalsMissed}/${totalSignals} | Summary: ${reportSummary}`);

        const telegramText = `New Lead\nName: ${name}\nPhone: ${normalizedPhone}\nEmail: ${email}\nTest: Strategic Clarity\nTime: ${timestamp}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        console.log(`[CLARITY_SEND] | Timestamp: ${timestamp} | Name: ${name}`);
        res.json({ name, noiseScore, noiseCleared, signalsMissed, totalNoise, totalSignals, report: aiReport });
        console.log(`[CLARITY_DONE] | Timestamp: ${timestamp} | Name: ${name}`);

    } catch (error) {
        console.error('Clarity analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze clarity diagnostic' });
    }
});

app.post('/analyze-presence', async (req, res) => {
    try {
        const { name, phone, email, powerMoves } = req.body;
        const { configByQuiz } = loadLeadershipQuizData();
        const expectedMoveCount = normalizeExecutivePresenceConfig(
            configByQuiz[EXECUTIVE_PRESENCE_KEY]
        ).scenarioCount;

        const normalizedName = String(name || '').trim();
        const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const hasValidPhone = /^\+\d{7,15}$/.test(normalizedPhone);
        const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        const validPowerMoves = Array.isArray(powerMoves)
            ? powerMoves.map(move => String(move || '').trim()).filter(Boolean)
            : [];

        if (!normalizedName || !hasValidPhone || !hasValidEmail || validPowerMoves.length !== expectedMoveCount) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Check if API calls are enabled
        if (!isApiCallsEnabled()) {
            return res.json({
                name: normalizedName,
                phone: normalizedPhone,
                email: normalizedEmail,
                summary: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                report: 'API CALL SUCCESSFUL, TEST CALL PREVENTED'
            });
        }

        const systemPrompt = `Analyze ${normalizedName}'s ${expectedMoveCount} 'Power Moves'. Tell them if they lead with 'Quiet Authority', 'Strategic Influence', or if they have 'Executive Presence Leaks'. Write a 180-word encouraging report. End with a strong call to action to buy the 1-on-1 coaching bundle.`;

        const userPrompt = `Name: ${normalizedName}
Phone: ${normalizedPhone}
Email: ${normalizedEmail}
Power Moves:
${validPowerMoves.map((move, index) => `${index + 1}. ${move}`).join('\n')}`;

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });

        let aiReport;
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.3-70b-versatile'
            });
            aiReport = String(completion.choices[0].message.content || '').trim();
        } catch (aiError) {
            console.error('Presence AI fallback activated:', aiError.message);
            aiReport = createFallbackPresenceReport(normalizedName, validPowerMoves);
        }

        const aiSummary = aiReport.split(/\.|\n/)[0].trim().slice(0, 180) || 'Presence profile generated';
        const timestamp = new Date().toISOString();
        const history = loadReportHistory();

        appendStoredReport(history, {
            timestamp,
            name: normalizedName,
            email: normalizedEmail,
            mobile: normalizedPhone,
            quizType: 'presence',
            assessmentType: 'Executive Presence',
            summary: aiSummary,
            powerMoves: validPowerMoves,
            report: aiReport
        });
        saveReportHistory(history);

        console.log(`[PRESENCE_GENERATE] | Timestamp: ${timestamp} | Name: ${normalizedName} | Phone: ${normalizedPhone} | Email: ${normalizedEmail} | PowerMoves: ${validPowerMoves.join(', ')} | Summary: ${aiSummary}`);

        const telegramText = `New Lead\nName: ${normalizedName}\nPhone: ${normalizedPhone}\nEmail: ${normalizedEmail}\nTest: Executive Presence\nTime: ${timestamp}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        res.json({
            name: normalizedName,
            phone: normalizedPhone,
            email: normalizedEmail,
            summary: aiSummary,
            report: aiReport
        });
    } catch (error) {
        console.error('Presence analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze executive presence' });
    }
});

app.post('/analyze-systems', async (req, res) => {
    try {
        const { name, phone, email, rankings } = req.body;
        const { configByQuiz } = loadLeadershipQuizData();
        const expectedScenarioCount = normalizeSystemsThinkingConfig(
            configByQuiz[SYSTEMS_THINKING_KEY]
        ).scenarioCount;

        const normalizedName = String(name || '').trim();
        const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const hasValidPhone = /^\+\d{7,15}$/.test(normalizedPhone);
        const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

        const normalizedRankings = Array.isArray(rankings)
            ? rankings
                .map((entry) => ({
                    scenarioId: String(entry && entry.scenarioId ? entry.scenarioId : '').trim(),
                    scenario: String(entry && entry.scenario ? entry.scenario : '').trim(),
                    orderedDomains: Array.isArray(entry && entry.orderedDomains)
                        ? entry.orderedDomains.map(domain => String(domain || '').trim()).filter(Boolean)
                        : []
                }))
                .filter(entry => entry.scenarioId && entry.orderedDomains.length > 0)
            : [];

        if (!normalizedName || !hasValidPhone || !hasValidEmail || normalizedRankings.length !== expectedScenarioCount) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Check if API calls are enabled
        if (!isApiCallsEnabled()) {
            return res.json({
                name: normalizedName,
                phone: normalizedPhone,
                email: normalizedEmail,
                summary: 'API CALL SUCCESSFUL, TEST CALL PREVENTED',
                report: 'API CALL SUCCESSFUL, TEST CALL PREVENTED'
            });
        }

        const rankingSummary = normalizedRankings
            .map((entry, index) => `${index + 1}. Scenario ${entry.scenarioId}: ${entry.scenario}\n   Ranking (most to least impact): ${entry.orderedDomains.join(' > ')}`)
            .join('\n\n');

        const systemPrompt = `You are an executive coach specializing in systems thinking.

Analyze the leader's impact hierarchies across organizational scenarios and classify their dominant thinking pattern:
- Linear Thinker: repeatedly prioritizes individual/HR symptoms over structural, strategic, process, or cultural dynamics.
- Systems Thinker: identifies upstream leverage points across strategy, process, operations, customer, and culture.

Write a practical, encouraging report in around 200 words with these sections:
1) Pattern Summary
2) What This Reveals About Their Leadership Lens
3) Hidden Connections They Are Missing or Capturing
4) Two concrete habits to improve systems thinking in real leadership decisions

Use direct, professional language and tailor specifically to the submitted rankings.`;

        const userPrompt = `Name: ${normalizedName}
Phone: ${normalizedPhone}
Email: ${normalizedEmail}

Impact hierarchy responses:
${rankingSummary}`;

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });

        let aiReport;
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.3-70b-versatile'
            });
            aiReport = String(completion.choices[0].message.content || '').trim();
        } catch (aiError) {
            console.error('Systems AI fallback activated:', aiError.message);
            aiReport = createFallbackSystemsReport(normalizedName, normalizedRankings);
        }

        const aiSummary = aiReport.split(/\.|\n/)[0].trim().slice(0, 180) || 'Systems thinking profile generated';
        const timestamp = new Date().toISOString();
        const history = loadReportHistory();

        appendStoredReport(history, {
            timestamp,
            name: normalizedName,
            email: normalizedEmail,
            mobile: normalizedPhone,
            quizType: 'systems',
            assessmentType: 'Systems Thinking',
            summary: aiSummary,
            rankings: normalizedRankings,
            report: aiReport
        });
        saveReportHistory(history);

        console.log(`[SYSTEMS_GENERATE] | Timestamp: ${timestamp} | Name: ${normalizedName} | Phone: ${normalizedPhone} | Email: ${normalizedEmail} | Responses: ${normalizedRankings.length} | Summary: ${aiSummary}`);

        const telegramText = `New Lead\nName: ${normalizedName}\nPhone: ${normalizedPhone}\nEmail: ${normalizedEmail}\nTest: Systems Thinking\nTime: ${timestamp}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        console.log(`[SYSTEMS_SEND] | Timestamp: ${timestamp} | Name: ${normalizedName}`);
        res.json({
            name: normalizedName,
            phone: normalizedPhone,
            email: normalizedEmail,
            summary: aiSummary,
            report: aiReport
        });
        console.log(`[SYSTEMS_DONE] | Timestamp: ${timestamp} | Name: ${normalizedName}`);
    } catch (error) {
        console.error('Systems analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze systems thinking diagnostic' });
    }
});

app.post('/analyze-transformation', async (req, res) => {
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

        // Check if a transformation report already exists for this phone
        // using the summary file (keyed by phone) to compare assessment counts
        const summaryCount = getTransformationAssessmentCount(normalizedPhone);
        if (summaryCount !== null && summaryCount === sourceReports.length) {
            return res.json({
                alreadyCreated: true,
                name,
                phone: normalizedPhone
            });
        }

        // Build full digest from ALL source reports (not just latest per type)
        // so the AI can see patterns, evolution, and recurring themes across every attempt.
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

        // Group by quiz type for a structured, readable prompt
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

        const systemPrompt = `You are an elite executive leadership coach with deep expertise in pattern recognition across repeated assessments. Build a professional transformation report using ALL provided assessment history — not just the most recent one.

You will receive multiple assessment attempts grouped by type and ordered chronologically. Analyse the FULL history to:
- Identify consistent strengths and persistent gaps across attempts
- Detect whether the leader is improving, regressing, or stuck in patterns
- Highlight high-frequency themes (behaviours or styles that keep appearing)
- Compare current state against industry-standard high-performing leadership behaviour
- Design practical and measurable development recommendations with mixed modalities: self-paced learning, classroom sessions, and coaching
- Clearly show how coaching/strategic sessions can close the identified gaps

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
- The executiveSummary must reference the TOTAL number of assessments and call out any recurring patterns or evolution detected.
- The gapAnalysis must name specific gaps visible across the full history, not just the latest result.
- Keep the tone professional, practical, and high credibility.
- Ensure recommendations are specific and behaviour based.
- Assume the first 6 action rows are prelisted focus areas, and optimise delivery mode/benefits/review cadence accordingly.
- Do not include markdown. Do not add any text outside JSON.`;

        const userPrompt = `Leader Name: ${name}
Mobile: ${normalizedPhone}
Total assessments on record: ${sourceReports.length} (${typeSummaryLine})

Full Assessment History (chronological within each category):
${sourceText}

Using ALL ${sourceReports.length} assessments above, generate a comprehensive transformation action plan that reflects the full pattern of this leader's journey, improvements, and persistent gaps.`;

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
            console.error('Transformation AI fallback activated:', aiError.message);
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

        // Save the assessment count used for this plan so we can skip regeneration next time
        setTransformationAssessmentCount(normalizedPhone, sourceReports.length);

        const telegramSummary = normalizedPlan.executiveSummary.replace(/\s+/g, ' ').trim().slice(0, 220);
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
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Coach is online at http://localhost:${PORT}`);
    console.log('Server is running. Press Ctrl+C to stop.\n');
});

// Catch any unhandled errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});
