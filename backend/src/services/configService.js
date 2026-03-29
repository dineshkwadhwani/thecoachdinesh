const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '../config/quiz-config.json');

/**
 * Load quiz configuration from file
 */
function loadQuizConfig() {
    try {
        const rawData = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error loading quiz config:', error.message);
        return {
            enableApiCalls: true,
            reflectYourStyle: { quizEnabled: true, deepInsightEnabled: true, quickQuestionCount: 10, deepQuestionCount: 25 },
            strategicClarity: { quizEnabled: true, scenarioCount: 5 },
            executivePresence: { quizEnabled: true, scenarioCount: 10 },
            systemsThinking: { quizEnabled: true, scenarioCount: 5 }
        };
    }
}

/**
 * Check if API calls are enabled
 */
function isApiCallsEnabled() {
    const config = loadQuizConfig();
    return config.enableApiCalls !== false;
}

module.exports = {
    loadQuizConfig,
    isApiCallsEnabled
};
