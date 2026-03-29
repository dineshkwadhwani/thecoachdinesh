const OpenAI = require('openai');
const { isApiCallsEnabled, loadQuizConfig } = require('../../services/configService');
const { loadReportHistory, saveReportHistory, appendStoredReport } = require('../../services/reportService');
const { sendTelegramMessage } = require('../../services/notificationService');

/**
 * Create fallback clarity report
 */
function createFallbackClarityReport(name, noiseScore, noiseCleared, totalNoise, signalsMissed, totalSignals) {
    const performance = noiseScore >= 70 ? 'strong' : noiseScore >= 50 ? 'developing' : 'emerging';
    return `${name}, your Strategic Clarity Diagnostic reveals a ${performance} ability to filter leadership noise. You correctly identified ${noiseCleared} out of ${totalNoise} noise items (${noiseScore}% accuracy)${signalsMissed > 0 ? `, though ${signalsMissed} critical signal${signalsMissed > 1 ? 's were' : ' was'} missed` : ''}. The most effective leaders develop a disciplined habit of distinguishing signal from noise before acting — and this score gives you a clear baseline to build from. To sharpen your clarity, try a weekly 15-minute signal audit: review your week's decisions and tag each driver as signal or noise in hindsight. A 1-on-1 Clarity Session with Coach Dinesh can help you identify the specific blind spots in your leadership lens and build a personalised framework for clearer, faster decision-making.`;
}

/**
 * Generate AI report for clarity analysis
 */
async function generateClarityReport(name, noiseScore, noiseCleared, signalsMissed, totalNoise, totalSignals) {
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

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile'
        });
        return completion.choices[0].message.content;
    } catch (aiError) {
        console.error('Clarity AI error:', aiError.message);
        throw aiError;
    }
}

/**
 * Handle POST /analyze-clarity
 */
async function handleClarityAnalysis(req, res) {
    try {
        const { name, phone, email, noiseCleared, signalsMissed, totalNoise, totalSignals, noiseScore } = req.body;
        const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
        const isValidPhone = /^\+\d{7,15}$/.test(normalizedPhone);

        if (!name || !email || !isValidPhone || typeof noiseCleared !== 'number' || typeof signalsMissed !== 'number') {
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

        let aiReport;
        try {
            aiReport = await generateClarityReport(name, noiseScore, noiseCleared, signalsMissed, totalNoise, totalSignals);
        } catch (aiError) {
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
}

module.exports = {
    handleClarityAnalysis
};
