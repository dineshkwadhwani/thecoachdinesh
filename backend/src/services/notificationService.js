/**
 * Send a message via Telegram bot
 */
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

module.exports = {
    sendTelegramMessage
};
