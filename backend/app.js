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
    const questionsPath = path.join(__dirname, 'questions.json');
    const configPath = path.join(__dirname, 'quiz-config.json');
    const messagesPath = path.join(__dirname, 'messages.json');

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

        const aiReport = completion.choices[0].message.content;
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
        const telegramText = `🚀 New Lead Generated!\nName: ${name}\nMobile: ${normalizedMobile}\nEmail: ${email}\nQuiz Type: ${normalizedQuizType}\nDominant Style: ${dominantStyleName}\nSecondary Style: ${secondaryStyleName || 'None'}\n\nFull report saved in admin panel.`;
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

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile'
        });

        const aiReport = completion.choices[0].message.content;
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

        const telegramText = `🎯 Clarity Lead!\nName: ${name}\nPhone: ${normalizedPhone}\nEmail: ${email}\nClarity Quotient: ${noiseScore}% — cleared ${noiseCleared}/${totalNoise} noise, missed ${signalsMissed}/${totalSignals} signals.`;
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

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile'
        });

        const aiReport = String(completion.choices[0].message.content || '').trim();
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

        const telegramText = `✅ New Executive Presence Lead! ${normalizedName} finished the simulator. Style: ${aiSummary}.`;
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

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile'
        });

        const aiReport = String(completion.choices[0].message.content || '').trim();
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

        const telegramText = `🧠 New Systems Thinking Lead! ${normalizedName} completed the hierarchy diagnostic. Summary: ${aiSummary}.`;
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
