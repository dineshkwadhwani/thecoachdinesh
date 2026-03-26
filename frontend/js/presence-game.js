const PRESENCE_QUESTIONS_KEY = 'presenceAssessment';
const PRESENCE_MESSAGES_KEY = 'executivePresence';
const PRESENCE_CONFIG_KEY = 'executivePresence';
const DEFAULT_PRESENCE_CONFIG = {
    quizEnabled: true,
    scenarioCount: 10
};
const DEFAULT_PRESENCE_MESSAGES = {
    identity: {
        title: "Let's start with your details",
        intro: 'Please share your name and mobile number to begin the simulator.',
        continueButton: 'Continue'
    },
    welcome: {
        title: 'Welcome to the Executive Presence Simulator',
        intro: 'Leaders are judged not just by their choices, but by how they handle the room.',
        scenarioInstruction: 'We will present {scenarioCount} high-stakes leadership scenarios. Choose your "Power Move" to see how you command presence.',
        startButton: 'Start'
    },
    progress: {
        identity: 'Step 1 of 5: Identify Yourself',
        welcome: 'Step 2 of 5: The Simulator',
        question: 'Scenario {current} of {total}',
        email: 'Step 4 of 5: Capture Email',
        report: 'Step 5 of 5: Your Presence Report'
    },
    labels: {
        questionCounter: 'Scenario {current} of {total}',
        nextScenarioButton: 'Next Scenario',
        seeResultsButton: 'See Results'
    },
    email: {
        title: 'Almost there',
        intro: 'Where should we send your Executive Presence report?',
        submitButton: 'Get My Presence Report',
        loadingButton: 'Analyzing...'
    },
    report: {
        title: 'Executive Presence Report, {name}',
        consultationGreeting: 'Dear {name},',
        consultationBody: 'Thank you for completing the Executive Presence Visual Simulator. I would love to offer you a complimentary 1-on-1 Presence Session to help you strengthen your executive impact. Send me a WhatsApp and we can find a time that works.',
        whatsappMessage: "Hey Coach, my name is {name}. I completed the Executive Presence Visual Simulator and want to discuss my report.",
        whatsappButton: 'Send WhatsApp',
        closeButton: 'Close'
    }
};

let presenceScenarios = [];
let presenceConfig = { ...DEFAULT_PRESENCE_CONFIG };
let presenceMessages = JSON.parse(JSON.stringify(DEFAULT_PRESENCE_MESSAGES));
let presenceState = createInitialPresenceState();

function createInitialPresenceState() {
    return {
        step: 'identity',
        name: '',
        countryCode: '+91',
        phone: '',
        email: '',
        currentQuestion: 0,
        answers: []
    };
}

function escapePresenceHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolvePresenceTemplate(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, (fullMatch, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return String(values[key]);
        }
        return fullMatch;
    });
}

function normalizePresenceMessages(rawMessages = {}) {
    const identityMessages = rawMessages && typeof rawMessages.identity === 'object' ? rawMessages.identity : {};
    const welcomeMessages = rawMessages && typeof rawMessages.welcome === 'object' ? rawMessages.welcome : {};
    const progressMessages = rawMessages && typeof rawMessages.progress === 'object' ? rawMessages.progress : {};
    const labelMessages = rawMessages && typeof rawMessages.labels === 'object' ? rawMessages.labels : {};
    const emailMessages = rawMessages && typeof rawMessages.email === 'object' ? rawMessages.email : {};
    const reportMessages = rawMessages && typeof rawMessages.report === 'object' ? rawMessages.report : {};

    return {
        identity: {
            title: String(identityMessages.title || DEFAULT_PRESENCE_MESSAGES.identity.title),
            intro: String(identityMessages.intro || DEFAULT_PRESENCE_MESSAGES.identity.intro),
            continueButton: String(identityMessages.continueButton || DEFAULT_PRESENCE_MESSAGES.identity.continueButton)
        },
        welcome: {
            title: String(welcomeMessages.title || DEFAULT_PRESENCE_MESSAGES.welcome.title),
            intro: String(welcomeMessages.intro || DEFAULT_PRESENCE_MESSAGES.welcome.intro),
            scenarioInstruction: String(welcomeMessages.scenarioInstruction || DEFAULT_PRESENCE_MESSAGES.welcome.scenarioInstruction),
            startButton: String(welcomeMessages.startButton || DEFAULT_PRESENCE_MESSAGES.welcome.startButton)
        },
        progress: {
            identity: String(progressMessages.identity || DEFAULT_PRESENCE_MESSAGES.progress.identity),
            welcome: String(progressMessages.welcome || DEFAULT_PRESENCE_MESSAGES.progress.welcome),
            question: String(progressMessages.question || DEFAULT_PRESENCE_MESSAGES.progress.question),
            email: String(progressMessages.email || DEFAULT_PRESENCE_MESSAGES.progress.email),
            report: String(progressMessages.report || DEFAULT_PRESENCE_MESSAGES.progress.report)
        },
        labels: {
            questionCounter: String(labelMessages.questionCounter || DEFAULT_PRESENCE_MESSAGES.labels.questionCounter),
            nextScenarioButton: String(labelMessages.nextScenarioButton || DEFAULT_PRESENCE_MESSAGES.labels.nextScenarioButton),
            seeResultsButton: String(labelMessages.seeResultsButton || DEFAULT_PRESENCE_MESSAGES.labels.seeResultsButton)
        },
        email: {
            title: String(emailMessages.title || DEFAULT_PRESENCE_MESSAGES.email.title),
            intro: String(emailMessages.intro || DEFAULT_PRESENCE_MESSAGES.email.intro),
            submitButton: String(emailMessages.submitButton || DEFAULT_PRESENCE_MESSAGES.email.submitButton),
            loadingButton: String(emailMessages.loadingButton || DEFAULT_PRESENCE_MESSAGES.email.loadingButton)
        },
        report: {
            title: String(reportMessages.title || DEFAULT_PRESENCE_MESSAGES.report.title),
            consultationGreeting: String(reportMessages.consultationGreeting || DEFAULT_PRESENCE_MESSAGES.report.consultationGreeting),
            consultationBody: String(reportMessages.consultationBody || DEFAULT_PRESENCE_MESSAGES.report.consultationBody),
            whatsappMessage: String(reportMessages.whatsappMessage || DEFAULT_PRESENCE_MESSAGES.report.whatsappMessage),
            whatsappButton: String(reportMessages.whatsappButton || DEFAULT_PRESENCE_MESSAGES.report.whatsappButton),
            closeButton: String(reportMessages.closeButton || DEFAULT_PRESENCE_MESSAGES.report.closeButton)
        }
    };
}

function normalizePresenceConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_PRESENCE_CONFIG.scenarioCount
    };
}

function getActiveScenarioCount() {
    return Math.max(1, presenceScenarios.length);
}

function openPresenceGame() {
    const modal = document.getElementById('presence-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    presenceState = createInitialPresenceState();
    presenceShowStep('identity');
}

function closePresenceGame() {
    const modal = document.getElementById('presence-modal');
    if (modal) modal.style.display = 'none';
    presenceState = createInitialPresenceState();
}

function presenceShowStep(step) {
    presenceState.step = step;
    ['identity', 'welcome', 'question', 'email', 'report'].forEach((stepName) => {
        const el = document.getElementById(`presence-step-${stepName}`);
        if (el) el.style.display = 'none';
    });

    const currentStep = document.getElementById(`presence-step-${step}`);
    if (currentStep) currentStep.style.display = 'block';

    presenceUpdateProgress(step);

    if (step === 'identity') {
        presenceRenderIdentity();
    }

    if (step === 'welcome') {
        presenceRenderWelcome();
    }

    if (step === 'question') {
        presenceRenderQuestion();
    }

    if (step === 'email') {
        presenceRenderEmailStep();
    }
}

function presenceUpdateProgress(step) {
    const progressText = document.getElementById('presence-progress-text');
    const progressFill = document.getElementById('presence-progress-fill');
    if (!progressText || !progressFill) return;

    const activeScenarioCount = getActiveScenarioCount();
    const questionProgress = presenceState.currentQuestion;
    const questionPct = 20 + Math.round((questionProgress / activeScenarioCount) * 60);

    const map = {
        identity: { text: presenceMessages.progress.identity, pct: 10 },
        welcome: { text: presenceMessages.progress.welcome, pct: 25 },
        question: {
            text: resolvePresenceTemplate(presenceMessages.progress.question, {
                current: Math.min(presenceState.currentQuestion + 1, activeScenarioCount),
                total: activeScenarioCount
            }),
            pct: questionPct
        },
        email: { text: presenceMessages.progress.email, pct: 80 },
        report: { text: presenceMessages.progress.report, pct: 100 }
    };

    const current = map[step] || map.identity;
    progressText.textContent = current.text;
    progressFill.style.width = `${current.pct}%`;
}

function presenceRenderIdentity() {
    const step = document.getElementById('presence-step-identity');
    if (!step) return;

    const title = step.querySelector('h2');
    const intro = step.querySelector('p');
    const button = step.querySelector('button.btn');

    if (title) title.textContent = presenceMessages.identity.title;
    if (intro) intro.textContent = presenceMessages.identity.intro;
    if (button) button.textContent = presenceMessages.identity.continueButton;
}

function presenceRenderWelcome() {
    const step = document.getElementById('presence-step-welcome');
    if (!step) return;

    const title = step.querySelector('h2');
    const paragraphs = step.querySelectorAll('p');
    const button = step.querySelector('button.btn');

    if (title) title.textContent = presenceMessages.welcome.title;
    if (paragraphs[0]) paragraphs[0].textContent = presenceMessages.welcome.intro;
    if (paragraphs[1]) {
        paragraphs[1].textContent = resolvePresenceTemplate(presenceMessages.welcome.scenarioInstruction, {
            scenarioCount: getActiveScenarioCount()
        });
    }
    if (button) button.textContent = presenceMessages.welcome.startButton;
}

function presenceRenderEmailStep() {
    const step = document.getElementById('presence-step-email');
    if (!step) return;

    const title = step.querySelector('h2');
    const intro = step.querySelector('p');
    const submitBtn = document.getElementById('presence-submit-btn');

    if (title) title.textContent = presenceMessages.email.title;
    if (intro) intro.textContent = presenceMessages.email.intro;
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = presenceMessages.email.submitButton;
    }
}

function presenceContinueFromIdentity() {
    const nameInput = document.getElementById('presence-name-input');
    const countryCodeInput = document.getElementById('presence-country-code');
    const phoneInput = document.getElementById('presence-phone-input');
    if (!nameInput || !countryCodeInput || !phoneInput) return;

    const name = nameInput.value.trim();
    const countryCode = countryCodeInput.value;
    const phoneDigits = phoneInput.value.trim().replace(/\D/g, '');
    const namePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;

    if (!name || !namePattern.test(name)) {
        alert('Please enter a valid name.');
        nameInput.focus();
        return;
    }

    if (!countryCode) {
        alert('Please select a country code.');
        countryCodeInput.focus();
        return;
    }

    if (!/^\d{7,15}$/.test(phoneDigits)) {
        alert('Please enter a valid mobile number (7–15 digits).');
        phoneInput.focus();
        return;
    }

    presenceState.name = name;
    presenceState.countryCode = countryCode;
    presenceState.phone = `${countryCode}${phoneDigits}`;
    presenceState.currentQuestion = 0;
    presenceState.answers = [];
    presenceShowStep('welcome');
}

function presenceStartFromWelcome() {
    presenceShowStep('question');
}

function presenceRenderQuestion() {
    const scenario = presenceScenarios[presenceState.currentQuestion];
    if (!scenario) {
        presenceShowStep('email');
        return;
    }

    const questionCounter = document.getElementById('presence-question-counter');
    const scenarioImage = document.getElementById('presence-scenario-image');
    const scenarioPrompt = document.getElementById('presence-scenario-prompt');
    const optionsContainer = document.getElementById('presence-options-container');
    const prevButton = document.getElementById('presence-prev-btn');
    const nextButton = document.getElementById('presence-next-btn');
    const currentAnswer = presenceState.answers[presenceState.currentQuestion];
    const activeScenarioCount = getActiveScenarioCount();

    if (questionCounter) {
        questionCounter.textContent = resolvePresenceTemplate(presenceMessages.labels.questionCounter, {
            current: presenceState.currentQuestion + 1,
            total: activeScenarioCount
        });
    }

    if (prevButton) {
        prevButton.disabled = presenceState.currentQuestion === 0;
    }

    if (nextButton) {
        nextButton.textContent = presenceState.currentQuestion === (activeScenarioCount - 1)
            ? presenceMessages.labels.seeResultsButton
            : presenceMessages.labels.nextScenarioButton;
        nextButton.disabled = !currentAnswer;
    }

    if (scenarioImage) {
        scenarioImage.src = scenario.image || scenario.imagePath || '';
        scenarioImage.alt = scenario.title || `Scenario ${presenceState.currentQuestion + 1}`;
    }

    if (scenarioPrompt) {
        scenarioPrompt.textContent = scenario.short_description || scenario.prompt || '';
    }

    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';
    scenario.options.forEach((option, optionIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'presence-option-card';
        if (currentAnswer && currentAnswer.choiceText === option.text) {
            button.classList.add('selected');
        }
        button.setAttribute('aria-label', `Option ${optionIndex + 1}`);
        button.textContent = option.text;
        button.addEventListener('click', () => presenceSelectOption(option, button));
        optionsContainer.appendChild(button);
    });
}

function presencePrevQuestion() {
    if (presenceState.currentQuestion === 0) {
        return;
    }

    presenceState.currentQuestion -= 1;
    presenceUpdateProgress('question');
    presenceRenderQuestion();
}

function presenceSelectOption(option, buttonEl) {
    const allButtons = document.querySelectorAll('.presence-option-card');
    allButtons.forEach((btn) => btn.classList.remove('selected'));
    if (buttonEl) buttonEl.classList.add('selected');

    presenceState.answers[presenceState.currentQuestion] = {
        scenarioId: presenceScenarios[presenceState.currentQuestion].id,
        presenceType: option.presenceType,
        choiceText: option.text
    };

    const nextButton = document.getElementById('presence-next-btn');
    if (nextButton) {
        nextButton.disabled = false;
    }
}

function presenceNextQuestion() {
    if (!presenceState.answers[presenceState.currentQuestion]) {
        alert('Please select an answer');
        return;
    }

    const activeScenarioCount = getActiveScenarioCount();
    presenceState.currentQuestion += 1;
    if (presenceState.currentQuestion < activeScenarioCount) {
        presenceUpdateProgress('question');
        presenceRenderQuestion();
    } else {
        presenceShowStep('email');
    }
}

async function presenceSubmitEmail() {
    const emailInput = document.getElementById('presence-email-input');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        emailInput.focus();
        return;
    }

    presenceState.email = email;

    const submitBtn = document.getElementById('presence-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = presenceMessages.email.loadingButton;
    }

    try {
        const response = await fetch('/analyze-presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: presenceState.name,
                phone: presenceState.phone,
                email: presenceState.email,
                powerMoves: presenceState.answers.map((entry) => entry.presenceType)
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Server error ${response.status}`);
        }

        const data = await response.json();
        presenceRenderReport(data.report || 'Your report is ready.');
        presenceShowStep('report');
    } catch (error) {
        console.error('[PRESENCE] Analyze error:', error);
        alert('Could not generate your report right now. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = presenceMessages.email.submitButton;
        }
    }
}

function presenceRenderReport(reportText) {
    const reportTitle = document.getElementById('presence-report-title');
    const reportBody = document.getElementById('presence-report-body');
    const consultation = document.getElementById('presence-consultation');
    const actions = document.getElementById('presence-report-actions');
    const participantName = presenceState.name;
    const templateValues = {
        name: participantName
    };

    if (reportTitle) {
        reportTitle.textContent = resolvePresenceTemplate(presenceMessages.report.title, templateValues);
    }

    if (reportBody) {
        const html = escapePresenceHtml(reportText)
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        reportBody.innerHTML = `<p>${html}</p>`;
    }

    if (consultation) {
        consultation.innerHTML = `
            <p>${escapePresenceHtml(resolvePresenceTemplate(presenceMessages.report.consultationGreeting, templateValues))}</p>
            <p>${escapePresenceHtml(resolvePresenceTemplate(presenceMessages.report.consultationBody, templateValues))}</p>
        `;
    }

    if (actions) {
        const whatsappMessage = encodeURIComponent(resolvePresenceTemplate(presenceMessages.report.whatsappMessage, templateValues));
        actions.innerHTML = `
            <a class="btn whatsapp-btn" href="https://wa.me/?text=${whatsappMessage}" target="_blank" rel="noopener noreferrer">${escapePresenceHtml(presenceMessages.report.whatsappButton)}</a>
            <button class="btn btn-secondary" onclick="closePresenceGame()">${escapePresenceHtml(presenceMessages.report.closeButton)}</button>
        `;
    }
}

async function initPresenceGame() {
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const scenarios = Array.isArray(data[PRESENCE_QUESTIONS_KEY]) ? data[PRESENCE_QUESTIONS_KEY] : [];
        presenceConfig = normalizePresenceConfig(data.config && data.config[PRESENCE_CONFIG_KEY]);
        presenceMessages = normalizePresenceMessages(data.messages && data.messages[PRESENCE_MESSAGES_KEY]);

        if (!presenceConfig.quizEnabled) {
            return;
        }

        const configuredScenarioCount = presenceConfig.scenarioCount;
        const activeScenarioCount = Math.min(configuredScenarioCount, scenarios.length);

        if (activeScenarioCount === 0) {
            throw new Error('No presence scenarios are available.');
        }

        if (scenarios.length < configuredScenarioCount) {
            console.warn(`[PRESENCE] Config requested ${configuredScenarioCount} scenarios, but only ${scenarios.length} are available. Using ${activeScenarioCount}.`);
        }

        presenceScenarios = scenarios.slice(0, activeScenarioCount);

        const launchButton = document.getElementById('presence-launch-btn');
        if (launchButton) {
            launchButton.style.display = '';
        }
    } catch (error) {
        console.warn('[PRESENCE] Could not load scenarios:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPresenceGame);
} else {
    initPresenceGame();
}