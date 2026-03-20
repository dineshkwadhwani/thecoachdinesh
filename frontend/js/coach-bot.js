function toggleBot() {
    const windowDiv = document.getElementById('bot-window');
    if (!windowDiv) return;

    windowDiv.classList.toggle('open');
    const isOpen = windowDiv.classList.contains('open');

    if (isOpen) {
        // keep the latest messages visible when opened
        const messages = document.getElementById('bot-messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
    }
}

async function sendMessage() {
    const input = document.getElementById('bot-input');
    const userText = input.value.trim();
    
    if (!userText) return;

    // 1. Show user message immediately
    appendMessage('User', userText);
    input.value = '';

    try {
        // 2. Fetch from your Node server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });

        // 3. Convert response to JSON
        const data = await response.json();
        console.log("Data received from Node:", data);

        // 4. Display the Coach's reply
        if (data.reply) {
            appendMessage('Coach Dinesh', data.reply);
        } else {
            appendMessage('System', 'The Coach sent an empty response.');
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        appendMessage('System', 'Connection to server failed.');
    }
}

function appendMessage(sender, text) {
    const container = document.getElementById('bot-messages');
    
    // Test if container exists
    if (!container) {
        console.error("I can't find the messages div!");
        return;
    }

    const msgDiv = document.createElement('div');
    msgDiv.style.padding = "8px";
    msgDiv.style.borderBottom = "1px solid #eee";
    
    // Convert new lines (\n) from AI into HTML breaks (<br>)
    const formattedText = text.replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${formattedText}`;
    
    // This is the line that actually puts it on the screen!
    container.appendChild(msgDiv);
    
    // Auto-scroll so the newest message is visible
    container.scrollTop = container.scrollHeight;
}

function setupEnterKeySend() {
    const botInput = document.getElementById('bot-input');
    if (!botInput) return;

    botInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Ensure the input is wired after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEnterKeySend);
} else {
    setupEnterKeySend();
}
