const express = require('express');
const path = require('path'); // Added for handling file paths
const cors = require('cors');
const { askDinesh } = require('./coachService');
require('dotenv').config();

const app = express();

// 1. SERVE STATIC FILES
// This tells Express to serve your CSS, JS, and Images from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(cors()); 
app.use(express.json());

app.get('/ping', (req, res) => {
  res.status(200).send('Coach is awake!');
});

// 2. SERVE THE HOME PAGE
// When someone goes to http://localhost:3000, send them your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 3. THE CHAT API
app.post('/chat', async (req, res) => {

    console.log("1. ackend received a request", req.body.message);
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
        console.error("X:sendTelegramMessage: ERROR:", error.message);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Coach is online at http://localhost:${PORT}`));