// Onboarding state
let onboardingStep = 'name'; // 'name', 'phone', 'done'
let userName = '';
let userPhone = '';

// Conversation limit
let conversationCount = parseInt(localStorage.getItem('conversationCount') || '0');

function toggleBot() {
    const windowDiv = document.getElementById('bot-window');
    if (!windowDiv) return;

    windowDiv.classList.toggle('open');
    const isOpen = windowDiv.classList.contains('open');

    if (isOpen) {
        // keep the latest messages visible when opened
        const messages = document.getElementById('bot-messages');
        if (messages) messages.scrollTop = messages.scrollHeight;

        // Start onboarding if not done
        if (onboardingStep === 'name') {
            appendMessage('Coach Dinesh', 'Hello! May I have your name?');
        }
    }
}

async function sendMessage() {
    const input = document.getElementById('bot-input');
    const userText = input.value.trim();
    
    if (!userText) return;

    // 1. Show user message immediately
    appendMessage(userName || 'User', userText);
    input.value = '';

    // Handle onboarding
    if (onboardingStep === 'name') {
        // local regex validation is the strong source for normal names
        const localNamePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;
        let isNameValid = localNamePattern.test(userText);

        if (!isNameValid) {
            // only call AI if local heuristics fail, to avoid false rejection
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "VALIDATE_NAME:" + userText })
                });
                const data = await response.json();
                const validation = data.reply.trim().toLowerCase();

                if (validation.includes('yes') && !validation.includes('no')) {
                    isNameValid = true;
                } else if (validation.includes('no') && !validation.includes('yes')) {
                    isNameValid = false;
                }
                // if ambiguous AI answer, keep current local decision (false)
            } catch (error) {
                console.warn("Name validation service error, using local check:", error);
            }
        } else {
            console.log("Local name validation accepted:", userText);
        }

        if (isNameValid) {
            userName = userText;
            console.log('User Name:', userName);
            onboardingStep = 'phone';
            appendMessage('Coach Dinesh', `Nice to meet you, ${userName}! May I have your telephone number?`);
        } else {
            appendMessage('Coach Dinesh', 'That name doesn\'t look valid yet. You can use a first name or nickname (e.g. "John" or "Sam"). Let\'s try again: by what name should I call you?');
        }

        return;
    }

    if (onboardingStep === 'phone') {
        if (userText.toLowerCase() === 'skip') {
            console.log('User Phone: Skipped');
            onboardingStep = 'done';

            // Generate AI-driven greeting
            const hour = new Date().getHours();
            let timeOfDay = 'morning';
            if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
            else if (hour >= 17) timeOfDay = 'evening';

            try {
                const greetingResponse = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "GENERATE_GREETING:" + JSON.stringify({ name: userName, phone: 'Not provided', timeOfDay }) })
                });
                const greetingData = await greetingResponse.json();
                appendMessage('Coach Dinesh', greetingData.reply);
            } catch (error) {
                console.error("Greeting Error:", error);
                appendMessage('Coach Dinesh', `Alright, ${userName}. Let's start our conversation! How can I help you today?`);
            }
            return;
        }

        // Simple phone validation: at least 10 digits
        const phoneRegex = /^\d{10,15}$/;
        if (phoneRegex.test(userText.replace(/\D/g, ''))) {
            userPhone = userText;
            console.log('User Phone:', userPhone);
            onboardingStep = 'done';

            // Generate AI-driven greeting
            const hour = new Date().getHours();
            let timeOfDay = 'morning';
            if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
            else if (hour >= 17) timeOfDay = 'evening';

            try {
                const greetingResponse = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "GENERATE_GREETING:" + JSON.stringify({ name: userName, phone: userPhone, timeOfDay }) })
                });
                const greetingData = await greetingResponse.json();
                appendMessage('Coach Dinesh', greetingData.reply);
            } catch (error) {
                console.error("Greeting Error:", error);
                appendMessage('Coach Dinesh', `Thank you, ${userName}! Your number is ${userPhone}. Let's start our conversation! How can I help you today?`);
            }
        } else {
            appendMessage('Coach Dinesh', 'That doesn\'t look like a valid phone number. Would you like to type it again or type "skip" to continue without it?');
        }
        return;
    }

    // Normal conversation
    if (conversationCount >= 7) {
        console.log('Conversation limit. ', conversationCount);
        appendMessage('Coach Dinesh', `Thank you for our conversation, ${userName}! To continue, please set up a time with me. Call me at (91) 9767676738.`);
        return;
    }

    conversationCount++;
    localStorage.setItem('conversationCount', conversationCount.toString());

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
