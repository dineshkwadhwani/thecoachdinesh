const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { isApiCallsEnabled, loadQuizConfig } = require('../../services/configService');
const { loadReportHistory, saveReportHistory, appendStoredReport, getLatestStoredReport } = require('../../services/reportService');
const { sendTelegramMessage } = require('../../services/notificationService');

const DEFAULT_LEADERSHIP_QUIZ_CONFIG = {
    quizEnabled: true,
    deepInsightEnabled: true,
    quickQuestionCount: 10,
    deepQuestionCount: 25
};

const LEADERSHIP_STYLE_MAP = { A: 'Visionary', B: 'Coaching', C: 'Democratic', D: 'Pacesetter' };

/**
 * Load leadership quiz questions from questions.json
 */
function loadLeadershipQuestions() {
    const questionsPath = path.join(__dirname, '../../config/questions.json');
    try {
        const questionsData = fs.readFileSync(questionsPath, 'utf-8');
        return JSON.parse(questionsData);
    } catch (error) {
        console.error('Error loading leadership questions:', error.message);
        return { leadership: [] };
    }
}

/**
 * Normalize leadership quiz config with defaults
 */
function normalizeLeadershipConfig(rawConfig = {}) {
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

/**
 * Create fallback report when AI service is unavailable
 */
function createFallbackLeadershipReport(name, dominantStyleName, secondaryStyleName, quizType) {
    const secondary = secondaryStyleName ? ` with a secondary tendency towards ${secondaryStyleName}` : '';
    if (quizType === 'deep') {
        return `Name\n${name}\n\nDominant Style\n${name} demonstrates a ${dominantStyleName} leadership style${secondary}. This profile is drawn from your extended response pattern across this diagnostic.\n\nSecondary Style\n${secondaryStyleName ? `A ${secondaryStyleName} tendency emerges as a complementary dimension, offering additional flexibility in varied leadership situations.` : 'No clear secondary style was identified in this assessment.'}\n\nComparison With Earlier Report\nThis deeper assessment confirms the pattern identified in earlier evaluations, providing a more detailed picture of how your style operates across complex scenarios.\n\nStyle Interpretation\nLeaders with a ${dominantStyleName} profile tend to bring a distinctive approach to decision-making, team engagement, and strategic execution. This style is most effective when applied with self-awareness and situational flexibility.\n\nStrengths\nYour ${dominantStyleName} orientation brings clear advantages in terms of consistency, credibility, and the ability to rally your team around a coherent direction.\n\nRisks And Blind Spots\nThe primary risk for ${dominantStyleName} leaders is over-reliance on a single mode of engagement. Expanding your repertoire will improve performance across diverse contexts.\n\nDevelopment Priorities\nFocus on deepening your situational awareness, building range across other leadership modes, and investing in structured coaching to accelerate your leadership growth.`;
    }
    return `${name}, your responses indicate a ${dominantStyleName} leadership style${secondary}. ${dominantStyleName} leaders bring a strong and consistent approach to how they engage with their teams and make decisions. Your key strengths lie in your ability to lead with clarity and conviction. To grow further, consider expanding your flexibility across other leadership modes, particularly in high-pressure or cross-functional contexts. A structured coaching conversation would help you unlock the next level of your leadership impact.`;
}

/**
 * Score leadership answers and determine styles
 */
function scoreLeadershipAnswers(answers) {
    const styleCounts = { A: 0, B: 0, C: 0, D: 0 };
    
    answers.forEach(answer => {
        if (styleCounts.hasOwnProperty(answer)) {
            styleCounts[answer]++;
        }
    });

    const rankedStyles = Object.entries(styleCounts)
        .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1]);
    
    const dominantStyle = rankedStyles[0][0];
    const dominantStyleName = LEADERSHIP_STYLE_MAP[dominantStyle];
    const secondaryStyle = rankedStyles[1] && rankedStyles[1][1] > 0 ? rankedStyles[1][0] : null;
    const secondaryStyleName = secondaryStyle ? LEADERSHIP_STYLE_MAP[secondaryStyle] : null;

    return { dominantStyle, dominantStyleName, secondaryStyle, secondaryStyleName, styleCounts, rankedStyles };
}

/**
 * Generate AI report for leadership analysis
 */
async function generateLeadershipReport(name, answers, quizType, dominantStyleName, secondaryStyleName, previousQuickReport) {
    const answerCount = answers.length;
    const answersText = answers.map((ans, i) => `Q${i+1}: ${ans}`).join(' | ');
    
    const styleCounts = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach(answer => {
        if (styleCounts.hasOwnProperty(answer)) styleCounts[answer]++;
    });
    
    const styleBreakdownText = Object.entries(styleCounts)
        .map(([styleKey, count]) => `${LEADERSHIP_STYLE_MAP[styleKey]}=${count}`)
        .join(', ');

    const previousReportContext = quizType === 'deep' && previousQuickReport
        ? `Previous quick report summary: ${previousQuickReport.report}\nPrevious dominant style: ${previousQuickReport.dominantStyle || 'Not provided'}\nPrevious secondary style: ${previousQuickReport.secondaryStyle || 'Not provided'}`
        : 'Previous quick report summary: Not available';

    const systemPrompt = quizType === 'deep'
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

    const userPrompt = quizType === 'deep'
        ? `Analyze these answers: ${answersText}

Name: ${name}
Quiz type: ${quizType}
Dominant Style Indicated: ${dominantStyleName}
Secondary Style Indicated: ${secondaryStyleName || 'None'}
Style breakdown: ${styleBreakdownText}
${previousReportContext}`
        : `Analyze these answers (A-D represent answer choices): ${answersText}

Name: ${name}
Quiz type: ${quizType}
Dominant Style Indicated: ${dominantStyleName}
Secondary Style Indicated: ${secondaryStyleName || 'None'}
Style breakdown: ${styleBreakdownText}`;

    const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
        });
        return completion.choices[0].message.content;
    } catch (aiError) {
        console.error('Leadership AI error:', aiError.message);
        throw aiError;
    }
}

/**
 * Handle POST /analyze-leadership
 */
async function handleLeadershipAnalysis(req, res) {
    try {
        const allQuizConfig = loadQuizConfig();
        const leadershipConfig = normalizeLeadershipConfig(allQuizConfig.reflectYourStyle);
        
        const { name, mobile, email, answers, quizType } = req.body;
        const answerCount = Array.isArray(answers) ? answers.length : 0;
        const normalizedMobile = typeof mobile === 'string' ? mobile.replace(/\s+/g, '') : '';
        const isValidMobile = /^\+\d{7,15}$/.test(normalizedMobile);
        const validAnswerCounts = [...new Set([leadershipConfig.quickQuestionCount, leadershipConfig.deepQuestionCount])];
        const normalizedQuizType = quizType === 'deep' ? 'deep' : 'quick';

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

        const history = loadReportHistory();
        const previousQuickReport = normalizedQuizType === 'deep'
            ? getLatestStoredReport(history, email, normalizedMobile, 'quick')
            : null;

        // Score answers
        const { dominantStyleName, secondaryStyleName } = scoreLeadershipAnswers(answers);

        // Generate report
        let aiReport;
        try {
            aiReport = await generateLeadershipReport(name, answers, normalizedQuizType, dominantStyleName, secondaryStyleName, previousQuickReport);
        } catch (aiError) {
            aiReport = createFallbackLeadershipReport(name, dominantStyleName, secondaryStyleName, normalizedQuizType);
        }

        const timestamp = new Date().toISOString();

        // Store report
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

        // Log
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

        // Return response
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
}

module.exports = {
    handleLeadershipAnalysis,
    loadLeadershipQuestions,
    normalizeLeadershipConfig,
    scoreLeadershipAnswers
};
