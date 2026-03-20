const express = require('express');
const path = require('path'); // Added for handling file paths
const cors = require('cors');
const { askDinesh } = require('./coachService');

const app = express();

// 1. SERVE STATIC FILES
// This tells Express to serve your CSS, JS, and Images from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(cors()); 
app.use(express.json());

// 2. SERVE THE HOME PAGE
// When someone goes to http://localhost:3000, send them your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 3. THE CHAT API
app.post('/chat', async (req, res) => {

    console.log("1. Backend received a request!"); // Check terminal
    console.log("2. Message content:", req.body.message);
    try {
        const { message } = req.body;
        const response = await askDinesh(message);

        console.log("3. AI responded successfully!");
        res.json({ reply: response });
    } catch (error) {
        console.error("4. ERROR:", error.message);
        console.error("AI Error:", error);
        res.status(500).json({ reply: "I'm having trouble connecting to my thoughts. Try again?" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Coach is online at http://localhost:${PORT}`));