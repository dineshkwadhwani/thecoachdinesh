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

function setPageCacheHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=900, must-revalidate');
    res.setHeader('Expires', new Date(Date.now() + pageCacheDurationMs).toUTCString());
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

app.get('/ping', (req, res) => {
  res.status(200).send('Coach is awake!');
});

// 2. SERVE THE HOME PAGE
// When someone goes to http://localhost:3000, send them your index.html
app.get('/', (req, res) => {
    setPageCacheHeaders(res);
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
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

    const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: telegramChatId,
            text
        })
    });

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
        const questionsPath = path.join(__dirname, 'questions.json');
        const questionsData = fs.readFileSync(questionsPath, 'utf-8');
        const questions = JSON.parse(questionsData);
        res.json(questions);
    } catch (error) {
        console.error('Error loading questions:', error.message);
        res.status(500).json({ error: 'Failed to load questions' });
    }
});

// 5. ANALYZE LEADERSHIP STYLE
app.post('/analyze-leadership', async (req, res) => {
    try {
        const { name, email, answers, quizType } = req.body;
        const answerCount = Array.isArray(answers) ? answers.length : 0;

        if (!name || !email || !Array.isArray(answers) || ![10, 25].includes(answerCount)) {
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
        const dominantStyle = Object.keys(styleCounts).reduce((a, b) => 
            styleCounts[a] > styleCounts[b] ? a : b
        );
        const dominantStyleName = styleMap[dominantStyle];

        // Build prompt for Groq AI
        const answersText = answers.map((ans, i) => `Q${i+1}: ${ans}`).join(' | ');
        
        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an executive leadership coach providing personalized feedback. Analyze these ${answerCount} leadership assessment answers for ${name}. The answer choices represent: A=Visionary, B=Coaching, C=Democratic, D=Pacesetter. Provide a 150-220 word report in second person that:\n1) Identifies your dominant leadership style and explains what it means\n2) Describes your strengths in this style\n3) Suggests areas where you can grow and develop\n4) Ends with exactly: "Want a much deeper evaluation. Take a indepth test across multiple scenarios."\n\nUse "you" and "your" throughout. Be warm, encouraging, and actionable.`
                },
                {
                    role: "user",
                    content: `Analyze these answers (A-D represent answer choices): ${answersText}\n\nName: ${name}\nQuiz type: ${quizType || 'quick'}\nDominant Style Indicated: ${dominantStyleName}`
                }
            ],
            model: "llama-3.3-70b-versatile",
        });

        const aiReport = completion.choices[0].message.content;

        // Log in the required format
        const timestamp = new Date().toISOString();
        const logMessage = `[REPORT_GENERATE] | Timestamp: ${timestamp} | Name: ${name} | Email: ${email} | Style: ${dominantStyleName} | Report: ${aiReport}`;
        console.log(logMessage);

        // Send Telegram notification
        const telegramText = `🚀 New Lead Generated!\nName: ${name}\nEmail: ${email}\nStyle: ${dominantStyleName}\nReport: ${aiReport}`;
        try {
            await sendTelegramMessage(telegramText);
        } catch (telegramError) {
            console.error('Telegram send error (non-blocking):', telegramError.message);
        }

        // Return the report to frontend
        res.json({
            dominantStyle: dominantStyleName,
            report: aiReport
        });

    } catch (error) {
        console.error('Leadership analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze leadership style' });
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
