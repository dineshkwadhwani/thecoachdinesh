const OpenAI = require('openai');
require('dotenv').config();

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const askDinesh = async (question) => {
    const completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: "You are Coach Dinesh. You are wise, direct, and encouraging. Answer as a mentor." },
            { role: "user", content: question }
        ],
        model: "llama-3.3-70b-versatile", // Fast and powerful
    });
    return completion.choices[0].message.content;
};

module.exports = { askDinesh };