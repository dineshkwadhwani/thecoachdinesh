// Onboarding state
let onboardingStep = 'form'; // 'form', 'done'
let userName = '';
let userPhone = '';

// Conversation limit
function getOrCreateBrowserId() {
    const existingId = localStorage.getItem('coachBotBrowserId');
    if (existingId) return existingId;

    const newId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('coachBotBrowserId', newId);
    return newId;
}

const browserId = getOrCreateBrowserId();
const conversationStorageKey = `conversationCount:${browserId}`;
const onboardingStorageKey = `onboarding:${browserId}`;
let conversationCount = parseInt(localStorage.getItem(conversationStorageKey) || '0');

function saveOnboardingData() {
    const payload = {
        name: userName,
        phone: userPhone,
        done: onboardingStep === 'done'
    };
    localStorage.setItem(onboardingStorageKey, JSON.stringify(payload));
}

function hydrateOnboardingData() {
    const raw = localStorage.getItem(onboardingStorageKey);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        const persistedName = String(parsed && parsed.name ? parsed.name : '').trim();
        const persistedPhone = String(parsed && parsed.phone ? parsed.phone : '').trim();
        const isDone = Boolean(parsed && parsed.done);

        if (isDone && persistedName && persistedPhone) {
            userName = persistedName;
            userPhone = persistedPhone;
            onboardingStep = 'done';
        }
    } catch (error) {
        console.warn('Could not parse persisted onboarding data:', error);
    }
}

hydrateOnboardingData();

function toggleBot() {
    const windowDiv = document.getElementById('bot-window');
    const launcherButton = document.getElementById('bot-launcher');
    if (!windowDiv) return;

    windowDiv.classList.toggle('open');
    const isOpen = windowDiv.classList.contains('open');

    if (launcherButton) {
        launcherButton.classList.toggle('is-hidden', isOpen);
    }

    if (isOpen) {
        // keep the latest messages visible when opened
        const messages = document.getElementById('bot-messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
    }
}

function openBot() {
    const windowDiv = document.getElementById('bot-window');
    const launcherButton = document.getElementById('bot-launcher');
    if (!windowDiv) return;

    if (!windowDiv.classList.contains('open')) {
        windowDiv.classList.add('open');
    }

    if (launcherButton) {
        launcherButton.classList.add('is-hidden');
    }

    const messages = document.getElementById('bot-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
}

function startBotChat() {
    const nameInputEl = document.getElementById('bot-name-input');
    const countryCodeEl = document.getElementById('bot-country-code-input');
    const phoneInputEl = document.getElementById('bot-phone-input');

    if (!nameInputEl || !countryCodeEl || !phoneInputEl) return;

    const nameInput = nameInputEl.value.trim();
    const countryCodeInput = countryCodeEl.value;
    const mobileInputRaw = phoneInputEl.value.trim();
    const mobileDigits = mobileInputRaw.replace(/\D/g, '');
    const localNamePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;

    if (!nameInput || !localNamePattern.test(nameInput)) {
        alert('Please enter a valid name.');
        nameInputEl.focus();
        return;
    }

    if (!countryCodeInput) {
        alert('Please select a country code.');
        countryCodeEl.focus();
        return;
    }

    if (!/^\d{7,15}$/.test(mobileDigits)) {
        alert('Please enter a valid mobile number (7 to 15 digits).');
        phoneInputEl.focus();
        return;
    }

    userName = nameInput;
    userPhone = `${countryCodeInput}${mobileDigits}`;
    onboardingStep = 'done';
    saveOnboardingData();

    const onboardingForm = document.getElementById('bot-onboarding-form');
    const messages = document.getElementById('bot-messages');
    const inputArea = document.getElementById('bot-input-area');

    if (onboardingForm) onboardingForm.style.display = 'none';
    if (messages) messages.style.display = 'block';
    if (inputArea) inputArea.style.display = 'flex';

    appendMessage('Coach Dinesh', `Hi ${userName}, welcome! How can I help you today?`);

    fetch('/notify-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, phone: userPhone })
    }).catch((notifyError) => {
        console.error('Telegram Notification Error:', notifyError);
    });

    const botInput = document.getElementById('bot-input');
    if (botInput) botInput.focus();
}

async function sendMessage() {
    if (onboardingStep !== 'done') {
        alert('Please enter your name and mobile number to start chatting.');
        return;
    }

    const input = document.getElementById('bot-input');
    const userText = input.value.trim();
    
    if (!userText) return;

    // 1. Show user message immediately
    appendMessage(userName || 'User', userText);
    input.value = '';

    // Normal conversation
    if (conversationCount >= 7) {
        console.log('Conversation limit. ', conversationCount);
        appendMessage('Coach Dinesh', `We can only have limited conversations here. Thank you for our conversation, ${userName}! To continue, please set up a time with me. Call me at (91) 9767676738.`);
        return;
    }

    conversationCount++;
    localStorage.setItem(conversationStorageKey, conversationCount.toString());

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

function initializeBotVisibility() {
    const windowDiv = document.getElementById('bot-window');
    const launcherButton = document.getElementById('bot-launcher');
    const onboardingForm = document.getElementById('bot-onboarding-form');
    const messages = document.getElementById('bot-messages');
    const inputArea = document.getElementById('bot-input-area');

    if (!windowDiv || !launcherButton) return;

    launcherButton.style.display = '';
    launcherButton.style.visibility = '';

    const isOpen = windowDiv.classList.contains('open');
    launcherButton.classList.toggle('is-hidden', isOpen);

    if (onboardingForm && messages && inputArea) {
        if (onboardingStep === 'done') {
            onboardingForm.style.display = 'none';
            messages.style.display = 'block';
            inputArea.style.display = 'flex';

            const botInput = document.getElementById('bot-input');
            if (botInput) {
                botInput.placeholder = userName
                    ? `Hi ${userName}, type your message...`
                    : 'Type a message...';
            }

            if (messages.children.length === 0) {
                appendMessage('Coach Dinesh', `Welcome back, ${userName}! Great to hear from you again. How can I help you today?`);
            }
        } else {
            onboardingForm.style.display = 'block';
            messages.style.display = 'none';
            inputArea.style.display = 'none';
        }
    }
}

// Ensure the input is wired after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setupEnterKeySend();
        initializeBotVisibility();
    });
} else {
    setupEnterKeySend();
    initializeBotVisibility();
}
