const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const askDinesh = async (question) => {
    let systemContent = "You are Coach Dinesh. You are wise, direct, and encouraging. Answer as a mentor.";
    let userContent = question;

    if (question.startsWith("VALIDATE_NAME:")) {
        const name = question.replace("VALIDATE_NAME:", "").trim();
        systemContent = "You are a name validator. Respond with only 'Yes' if the provided text looks like a valid human name (e.g., proper nouns, not gibberish or numbers). Respond with only 'No' if it does not. Do not add any extra text.";
        userContent = `Is "${name}" a valid human name?`;
    } else if (question.startsWith("GENERATE_GREETING:")) {
        const data = JSON.parse(question.replace("GENERATE_GREETING:", "").trim());
        systemContent = "You are Coach Dinesh, a leadership coach. Generate a warm, personalized greeting message after collecting a user's name and phone number. Make it contextual based on the time of day. Include confirmation of their details and invite them to start the conversation. Keep it professional and engaging.";
        userContent = `User name: ${data.name}, Phone: ${data.phone}, Time of day: ${data.timeOfDay}. Generate a greeting message.`;
    }

    const completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent }
        ],
        model: "llama-3.3-70b-versatile", // Fast and powerful
    });
    return completion.choices[0].message.content;
};

module.exports = { askDinesh };