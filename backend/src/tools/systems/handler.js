const OpenAI = require('openai');
const { isApiCallsEnabled, loadQuizConfig } = require('../../services/configService');
const { loadReportHistory, saveReportHistory, appendStoredReport } = require('../../services/reportService');
const { sendTelegramMessage } = require('../../services/notificationService');

const DEFAULT_SYSTEMS_THINKING_CONFIG = {
    quizEnabled: true,
    scenarioCount: 5
};

/**
 * Normalize systems thinking config with defaults
 */
function normalizeSystemsThinkingConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_SYSTEMS_THINKING_CONFIG.scenarioCount
    };
}

/**
 * Create fallback systems report
 */
function createFallbackSystemsReport(name, rankings) {
    const scenarioCount = Array.isArray(rankings) ? rankings.length : 0;
    return `${name}, your Systems Thinking Diagnostic across ${scenarioCount} scenario${scenarioCount !== 1 ? 's' : ''} reveals your current impact hierarchy preferences. The most effective systems thinkers learn to look upstream from symptoms — identifying structural, process, and cultural leverage points rather than reacting to surface-level people or operational issues. Your response pattern provides a valuable baseline. To develop further, practise asking "what system is producing this result?" before acting. Building this habit consistently will significantly extend your strategic influence. A coaching conversation with Coach Dinesh can help you map your specific systems-thinking gaps and design a targeted development path.`;
}

/**
 * Generate AI report for systems thinking analysis
 */
async function generateSystemsReport(name, phone, email, rankings, expectedScenarioCount) {
    const rankingSummary = rankings
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

    const userPrompt = `Name: ${name}
Phone: ${phone}
Email: ${email}

Impact hierarchy responses:
${rankingSummary}`;

    const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile'
        });
        return String(completion.choices[0].message.content || '').trim();
    } catch (aiError) {
        console.error('Systems AI error:', aiError.message);
        throw aiError;
    }
}

/**
 * Handle POST /analyze-systems
 */
async function handleSystemsAnalysis(req, res) {
    try {
        const allQuizConfig = loadQuizConfig();
        const systemsConfig = normalizeSystemsThinkingConfig(allQuizConfig.systemsThinking);

        const { name, phone, email, rankings } = req.body;
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

        if (!normalizedName || !hasValidPhone || !hasValidEmail || normalizedRankings.length !== systemsConfig.scenarioCount) {
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

        let aiReport;
        try {
            aiReport = await generateSystemsReport(normalizedName, normalizedPhone, normalizedEmail, normalizedRankings, systemsConfig.scenarioCount);
        } catch (aiError) {
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
}

module.exports = {
    handleSystemsAnalysis
};
