const OpenAI = require('openai');
const { isApiCallsEnabled, loadQuizConfig } = require('../../services/configService');
const { loadReportHistory, saveReportHistory, appendStoredReport } = require('../../services/reportService');
const { sendTelegramMessage } = require('../../services/notificationService');

const DEFAULT_EXECUTIVE_PRESENCE_CONFIG = {
    quizEnabled: true,
    scenarioCount: 10
};

/**
 * Normalize executive presence config with defaults
 */
function normalizeExecutivePresenceConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_EXECUTIVE_PRESENCE_CONFIG.scenarioCount
    };
}

/**
 * Create fallback presence report
 */
function createFallbackPresenceReport(name, powerMoves) {
    const moveList = Array.isArray(powerMoves) && powerMoves.length > 0
        ? powerMoves.join(', ')
        : 'your selected scenarios';
    return `${name}, your Executive Presence Simulator results show a thoughtful approach to high-stakes leadership moments. Across ${moveList}, your choices reveal how you instinctively frame authority, influence, and credibility under pressure. Strong executive presence is built from consistent, intentional behaviour — and your results highlight both areas of natural strength and specific opportunities to elevate your impact. Leaders who invest in their presence see measurable improvements in stakeholder confidence, team performance, and career trajectory. A 1-on-1 coaching session would help you translate these insights into a targeted presence development plan.`;
}

/**
 * Generate AI report for presence analysis
 */
async function generatePresenceReport(name, phone, email, powerMoves, expectedMoveCount) {
    const systemPrompt = `Analyze ${name}'s ${expectedMoveCount} 'Power Moves'. Tell them if they lead with 'Quiet Authority', 'Strategic Influence', or if they have 'Executive Presence Leaks'. Write a 180-word encouraging report. End with a strong call to action to buy the 1-on-1 coaching bundle.`;

    const userPrompt = `Name: ${name}
Phone: ${phone}
Email: ${email}
Power Moves:
${powerMoves.map((move, index) => `${index + 1}. ${move}`).join('\n')}`;

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
        console.error('Presence AI error:', aiError.message);
        throw aiError;
    }
}

/**
 * Handle POST /analyze-presence
 */
async function handlePresenceAnalysis(req, res) {
    try {
        const allQuizConfig = loadQuizConfig();
        const presenceConfig = normalizeExecutivePresenceConfig(allQuizConfig.executivePresence);

        const { name, phone, email, powerMoves } = req.body;
        const normalizedName = String(name || '').trim();
        const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const hasValidPhone = /^\+\d{7,15}$/.test(normalizedPhone);
        const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        const validPowerMoves = Array.isArray(powerMoves)
            ? powerMoves.map(move => String(move || '').trim()).filter(Boolean)
            : [];

        if (!normalizedName || !hasValidPhone || !hasValidEmail || validPowerMoves.length !== presenceConfig.scenarioCount) {
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
            aiReport = await generatePresenceReport(normalizedName, normalizedPhone, normalizedEmail, validPowerMoves, presenceConfig.scenarioCount);
        } catch (aiError) {
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
}

module.exports = {
    handlePresenceAnalysis
};
