const SYSTEMS_CONFIG_KEY = 'systemsThinking';
const SYSTEMS_MESSAGES_KEY = 'systemsThinking';
const SYSTEMS_QUESTIONS_KEY = 'systemsAssessment';

const DEFAULT_SYSTEMS_CONFIG = {
    quizEnabled: true,
    scenarioCount: 5
};

const DEFAULT_SYSTEMS_MESSAGES = {
    identity: {
        title: "Let's start with your details",
        intro: 'Please share your name and mobile number to begin the Systems Thinking diagnostic.',
        continueButton: 'Continue'
    },
    welcome: {
        title: 'Welcome to the Systems Thinking Diagnostic',
        intro: 'Strong leaders do not just solve visible problems; they trace hidden connections across people, process, culture, and strategy.',
        whatItDoes: 'In this diagnostic, you will rank impact areas from most affected to least affected for each scenario.',
        outcome: 'Outcome: You will discover whether your default lens is linear or systems-level, and where to improve your leadership decisions.',
        startButton: 'Start the Test'
    },
    progress: {
        identity: 'Step 1 of 5: Identify Yourself',
        welcome: 'Step 2 of 5: The Diagnostic',
        question: 'Scenario {current} of {total}',
        email: 'Step 4 of 5: Capture Email',
        report: 'Step 5 of 5: Your Systems Thinking Report'
    },
    labels: {
        scenarioCounter: 'Scenario {current} of {total}',
        rankedHeader: 'Your impact hierarchy (top = most impacted)',
        availableHeader: 'Tap areas in impact order',
        nextScenarioButton: 'Next Scenario',
        seeResultsButton: 'See Results',
        removeButton: 'Remove'
    },
    email: {
        title: 'Almost there',
        intro: 'Where should we send your Systems Thinking report?',
        submitButton: 'Get My Systems Report',
        loadingButton: 'Analyzing...'
    },
    report: {
        title: 'Systems Thinking Report, {name}',
        consultationGreeting: 'Dear {name},',
        consultationBody: 'This is just a sample evaluation to help you notice your pattern of thinking. Smarter leaders navigate systems more effectively. If you would love to discuss further, I can help you streamline your thinking pattern. Send me a WhatsApp.',
        whatsappMessage: 'Hey Coach, my name is {name}. I completed the Systems Thinking Diagnostic and want to discuss my report.',
        whatsappButton: 'Send WhatsApp',
        closeButton: 'Close'
    }
};

let systemsConfig = { ...DEFAULT_SYSTEMS_CONFIG };
let systemsMessages = JSON.parse(JSON.stringify(DEFAULT_SYSTEMS_MESSAGES));
let systemsAllScenarios = [];
let systemsScenarios = [];
let systemsState = createInitialSystemsState();

function createInitialSystemsState() {
    return {
        step: 'identity',
        name: '',
        countryCode: '+91',
        phone: '',
        email: '',
        currentQuestion: 0,
        rankings: []
    };
}

function normalizeSystemsConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_SYSTEMS_CONFIG.scenarioCount
    };
}

function normalizeSystemsMessages(rawMessages = {}) {
    const identityMessages = rawMessages && typeof rawMessages.identity === 'object' ? rawMessages.identity : {};
    const welcomeMessages = rawMessages && typeof rawMessages.welcome === 'object' ? rawMessages.welcome : {};
    const progressMessages = rawMessages && typeof rawMessages.progress === 'object' ? rawMessages.progress : {};
    const labelMessages = rawMessages && typeof rawMessages.labels === 'object' ? rawMessages.labels : {};
    const emailMessages = rawMessages && typeof rawMessages.email === 'object' ? rawMessages.email : {};
    const reportMessages = rawMessages && typeof rawMessages.report === 'object' ? rawMessages.report : {};

    return {
        identity: {
            title: String(identityMessages.title || DEFAULT_SYSTEMS_MESSAGES.identity.title),
            intro: String(identityMessages.intro || DEFAULT_SYSTEMS_MESSAGES.identity.intro),
            continueButton: String(identityMessages.continueButton || DEFAULT_SYSTEMS_MESSAGES.identity.continueButton)
        },
        welcome: {
            title: String(welcomeMessages.title || DEFAULT_SYSTEMS_MESSAGES.welcome.title),
            intro: String(welcomeMessages.intro || DEFAULT_SYSTEMS_MESSAGES.welcome.intro),
            whatItDoes: String(welcomeMessages.whatItDoes || DEFAULT_SYSTEMS_MESSAGES.welcome.whatItDoes),
            outcome: String(welcomeMessages.outcome || DEFAULT_SYSTEMS_MESSAGES.welcome.outcome),
            startButton: String(welcomeMessages.startButton || DEFAULT_SYSTEMS_MESSAGES.welcome.startButton)
        },
        progress: {
            identity: String(progressMessages.identity || DEFAULT_SYSTEMS_MESSAGES.progress.identity),
            welcome: String(progressMessages.welcome || DEFAULT_SYSTEMS_MESSAGES.progress.welcome),
            question: String(progressMessages.question || DEFAULT_SYSTEMS_MESSAGES.progress.question),
            email: String(progressMessages.email || DEFAULT_SYSTEMS_MESSAGES.progress.email),
            report: String(progressMessages.report || DEFAULT_SYSTEMS_MESSAGES.progress.report)
        },
        labels: {
            scenarioCounter: String(labelMessages.scenarioCounter || DEFAULT_SYSTEMS_MESSAGES.labels.scenarioCounter),
            rankedHeader: String(labelMessages.rankedHeader || DEFAULT_SYSTEMS_MESSAGES.labels.rankedHeader),
            availableHeader: String(labelMessages.availableHeader || DEFAULT_SYSTEMS_MESSAGES.labels.availableHeader),
            nextScenarioButton: String(labelMessages.nextScenarioButton || DEFAULT_SYSTEMS_MESSAGES.labels.nextScenarioButton),
            seeResultsButton: String(labelMessages.seeResultsButton || DEFAULT_SYSTEMS_MESSAGES.labels.seeResultsButton),
            removeButton: String(labelMessages.removeButton || DEFAULT_SYSTEMS_MESSAGES.labels.removeButton)
        },
        email: {
            title: String(emailMessages.title || DEFAULT_SYSTEMS_MESSAGES.email.title),
            intro: String(emailMessages.intro || DEFAULT_SYSTEMS_MESSAGES.email.intro),
            submitButton: String(emailMessages.submitButton || DEFAULT_SYSTEMS_MESSAGES.email.submitButton),
            loadingButton: String(emailMessages.loadingButton || DEFAULT_SYSTEMS_MESSAGES.email.loadingButton)
        },
        report: {
            title: String(reportMessages.title || DEFAULT_SYSTEMS_MESSAGES.report.title),
            consultationGreeting: String(reportMessages.consultationGreeting || DEFAULT_SYSTEMS_MESSAGES.report.consultationGreeting),
            consultationBody: String(reportMessages.consultationBody || DEFAULT_SYSTEMS_MESSAGES.report.consultationBody),
            whatsappMessage: String(reportMessages.whatsappMessage || DEFAULT_SYSTEMS_MESSAGES.report.whatsappMessage),
            whatsappButton: String(reportMessages.whatsappButton || DEFAULT_SYSTEMS_MESSAGES.report.whatsappButton),
            closeButton: String(reportMessages.closeButton || DEFAULT_SYSTEMS_MESSAGES.report.closeButton)
        }
    };
}

function escapeSystemsHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveSystemsTemplate(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, (fullMatch, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return String(values[key]);
        }
        return fullMatch;
    });
}

function getActiveSystemsScenarioCount() {
    return Math.max(1, systemsScenarios.length);
}

function shuffleSystemsArray(arr) {
    const output = [...arr];
    for (let i = output.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
}

function openSystemsGame() {
    const modal = document.getElementById('systems-modal');
    if (!modal) return;

    systemsState = createInitialSystemsState();
    systemsScenarios = [];
    const notice = document.getElementById('already-taken-notice-systems');
    if (notice) notice.remove();
    const continueBtn = document.querySelector('#systems-step-identity .btn');
    if (continueBtn) continueBtn.style.display = '';

    const scenarioCount = Math.min(systemsConfig.scenarioCount, systemsAllScenarios.length);
    systemsScenarios = shuffleSystemsArray(systemsAllScenarios).slice(0, scenarioCount);

    if (systemsScenarios.length === 0) {
        alert('No systems scenarios are available right now.');
        return;
    }

    modal.style.display = 'flex';
    systemsShowStep('identity');
}

function closeSystemsGame() {
    const modal = document.getElementById('systems-modal');
    if (modal) modal.style.display = 'none';
    systemsState = createInitialSystemsState();
    systemsScenarios = [];
}

function systemsShowStep(step) {
    systemsState.step = step;

    ['identity', 'welcome', 'question', 'email', 'report'].forEach((stepName) => {
        const el = document.getElementById(`systems-step-${stepName}`);
        if (el) el.style.display = 'none';
    });

    const currentStep = document.getElementById(`systems-step-${step}`);
    if (currentStep) currentStep.style.display = 'block';

    systemsUpdateProgress(step);

    if (step === 'identity') systemsRenderIdentity();
    if (step === 'welcome') systemsRenderWelcome();
    if (step === 'question') systemsRenderQuestion();
    if (step === 'email') systemsRenderEmail();
}

function systemsUpdateProgress(step) {
    const progressText = document.getElementById('systems-progress-text');
    const progressFill = document.getElementById('systems-progress-fill');
    if (!progressText || !progressFill) return;

    const total = getActiveSystemsScenarioCount();
    const questionPct = 20 + Math.round((systemsState.currentQuestion / total) * 60);

    const map = {
        identity: { text: systemsMessages.progress.identity, pct: 10 },
        welcome: { text: systemsMessages.progress.welcome, pct: 25 },
        question: {
            text: resolveSystemsTemplate(systemsMessages.progress.question, {
                current: Math.min(systemsState.currentQuestion + 1, total),
                total
            }),
            pct: questionPct
        },
        email: { text: systemsMessages.progress.email, pct: 80 },
        report: { text: systemsMessages.progress.report, pct: 100 }
    };

    const current = map[step] || map.identity;
    progressText.textContent = current.text;
    progressFill.style.width = `${current.pct}%`;
}

function systemsRenderIdentity() {
    const step = document.getElementById('systems-step-identity');
    if (!step) return;

    const title = step.querySelector('h2');
    const intro = step.querySelector('p');
    const button = document.getElementById('systems-continue-btn');

    if (title) title.textContent = systemsMessages.identity.title;
    if (intro) intro.textContent = systemsMessages.identity.intro;
    if (button) button.textContent = systemsMessages.identity.continueButton;
}

function systemsRenderWelcome() {
    const title = document.getElementById('systems-welcome-title');
    const copy = document.getElementById('systems-welcome-copy');
    const button = document.getElementById('systems-welcome-start-btn');

    if (title) title.textContent = systemsMessages.welcome.title;
    if (copy) {
        copy.innerHTML = `
            <p>${escapeSystemsHtml(systemsMessages.welcome.intro)}</p>
            <p>${escapeSystemsHtml(systemsMessages.welcome.whatItDoes)}</p>
            <p>${escapeSystemsHtml(systemsMessages.welcome.outcome)}</p>
        `;
    }
    if (button) button.textContent = systemsMessages.welcome.startButton;
}

function systemsRenderEmail() {
    const title = document.getElementById('systems-email-title');
    const intro = document.getElementById('systems-email-intro');
    const submitBtn = document.getElementById('systems-submit-btn');

    if (title) title.textContent = systemsMessages.email.title;
    if (intro) intro.textContent = systemsMessages.email.intro;
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = systemsMessages.email.submitButton;
    }
}

async function systemsContinueFromIdentity() {
    const nameInput = document.getElementById('systems-name-input');
    const countryCodeInput = document.getElementById('systems-country-code');
    const phoneInput = document.getElementById('systems-phone-input');
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

    systemsState.name = name;
    systemsState.countryCode = countryCode;
    systemsState.phone = `${countryCode}${phoneDigits}`;

    const continueBtn = document.querySelector('#systems-step-identity .btn');
    const containerEl = document.getElementById('systems-step-identity');
    const alreadyTaken = await checkExistingReportAndShowNotice(systemsState.phone, 'systems', name, containerEl, continueBtn);
    if (alreadyTaken) return;

    systemsState.currentQuestion = 0;
    systemsState.rankings = new Array(getActiveSystemsScenarioCount());
    systemsShowStep('welcome');
}

function systemsStartFromWelcome() {
    systemsShowStep('question');
}

function systemsGetCurrentEntry() {
    const idx = systemsState.currentQuestion;
    const scenario = systemsScenarios[idx];
    if (!scenario) return null;

    if (!systemsState.rankings[idx]) {
        systemsState.rankings[idx] = {
            scenarioId: String(scenario.id),
            scenario: scenario.scenario,
            orderedDomains: []
        };
    }

    return systemsState.rankings[idx];
}

function systemsRenderQuestion() {
    const total = getActiveSystemsScenarioCount();
    const idx = systemsState.currentQuestion;
    const scenario = systemsScenarios[idx];
    if (!scenario) {
        systemsShowStep('email');
        return;
    }

    const currentEntry = systemsGetCurrentEntry();
    if (!currentEntry) return;

    const counter = document.getElementById('systems-question-counter');
    const progressFill = document.getElementById('systems-question-progress-fill');
    const scenarioText = document.getElementById('systems-scenario-text');
    const availableTitle = document.getElementById('systems-available-title');
    const rankedTitle = document.getElementById('systems-ranked-title');
    const domainButtons = document.getElementById('systems-domain-buttons');
    const rankedList = document.getElementById('systems-ranked-list');
    const prevBtn = document.getElementById('systems-prev-btn');
    const nextBtn = document.getElementById('systems-next-btn');

    if (counter) {
        counter.textContent = resolveSystemsTemplate(systemsMessages.labels.scenarioCounter, {
            current: idx + 1,
            total
        });
    }

    if (progressFill) {
        progressFill.style.width = `${((idx + 1) / total) * 100}%`;
    }

    if (scenarioText) scenarioText.textContent = scenario.scenario;
    if (availableTitle) availableTitle.textContent = systemsMessages.labels.availableHeader;
    if (rankedTitle) rankedTitle.textContent = systemsMessages.labels.rankedHeader;

    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) {
        nextBtn.textContent = idx === (total - 1)
            ? systemsMessages.labels.seeResultsButton
            : systemsMessages.labels.nextScenarioButton;
        nextBtn.disabled = currentEntry.orderedDomains.length !== scenario.domains.length;
    }

    if (domainButtons) {
        domainButtons.innerHTML = '';
        scenario.domains.forEach((domain) => {
            const isSelected = currentEntry.orderedDomains.includes(domain.name);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'systems-domain-button';
            button.disabled = isSelected;
            button.innerHTML = `
                <span>${escapeSystemsHtml(domain.name)}</span>
                <small class="systems-domain-description">${escapeSystemsHtml(domain.description || '')}</small>
            `;
            button.addEventListener('click', () => systemsSelectDomain(domain.name));
            domainButtons.appendChild(button);
        });
    }

    systemsRenderRankedList();
}

function systemsRenderRankedList() {
    const rankedList = document.getElementById('systems-ranked-list');
    if (!rankedList) return;

    const entry = systemsGetCurrentEntry();
    if (!entry) return;

    rankedList.innerHTML = '';

    if (!entry.orderedDomains.length) {
        rankedList.innerHTML = '<p class="progress-text">No areas ranked yet.</p>';
        return;
    }

    entry.orderedDomains.forEach((domainName, index) => {
        const row = document.createElement('div');
        row.className = 'systems-ranked-item';
        row.innerHTML = `
            <div class="systems-ranked-text"><span class="systems-ranked-order">${index + 1}.</span>${escapeSystemsHtml(domainName)}</div>
            <button type="button" class="systems-remove-btn" aria-label="Remove ${escapeSystemsHtml(domainName)}">${escapeSystemsHtml(systemsMessages.labels.removeButton)}</button>
        `;

        const btn = row.querySelector('button');
        if (btn) {
            btn.addEventListener('click', () => systemsRemoveDomain(index));
        }
        rankedList.appendChild(row);
    });
}

function systemsSelectDomain(domainName) {
    const entry = systemsGetCurrentEntry();
    if (!entry) return;

    if (!entry.orderedDomains.includes(domainName)) {
        entry.orderedDomains.push(domainName);
    }

    systemsRenderQuestion();
}

function systemsRemoveDomain(index) {
    const entry = systemsGetCurrentEntry();
    if (!entry) return;

    if (index >= 0 && index < entry.orderedDomains.length) {
        entry.orderedDomains.splice(index, 1);
    }

    systemsRenderQuestion();
}

function systemsPrevQuestion() {
    if (systemsState.currentQuestion === 0) return;
    systemsState.currentQuestion -= 1;
    systemsShowStep('question');
}

function systemsNextQuestion() {
    const entry = systemsGetCurrentEntry();
    const scenario = systemsScenarios[systemsState.currentQuestion];
    if (!entry || !scenario) return;

    if (entry.orderedDomains.length !== scenario.domains.length) {
        alert('Please rank all impact areas from top to bottom.');
        return;
    }

    systemsState.currentQuestion += 1;
    if (systemsState.currentQuestion < getActiveSystemsScenarioCount()) {
        systemsShowStep('question');
    } else {
        systemsShowStep('email');
    }
}

async function systemsSubmitEmail() {
    const emailInput = document.getElementById('systems-email-input');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        emailInput.focus();
        return;
    }

    systemsState.email = email;

    const submitBtn = document.getElementById('systems-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = systemsMessages.email.loadingButton;
    }

    try {
        const response = await fetch('/analyze-systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: systemsState.name,
                phone: systemsState.phone,
                email: systemsState.email,
                rankings: systemsState.rankings
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Server error ${response.status}`);
        }

        const data = await response.json();
        systemsRenderReport(data.report || 'Your report is ready.');
        systemsShowStep('report');
    } catch (error) {
        console.error('[SYSTEMS] Analyze error:', error);
        alert('Could not generate your report right now. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = systemsMessages.email.submitButton;
        }
    }
}

function systemsRenderReport(reportText) {
    const title = document.getElementById('systems-report-title');
    const body = document.getElementById('systems-report-body');
    const consultation = document.getElementById('systems-consultation');
    const actions = document.getElementById('systems-report-actions');
    const templateValues = { name: systemsState.name };

    if (title) {
        title.textContent = resolveSystemsTemplate(systemsMessages.report.title, templateValues);
    }

    if (body) {
        const html = escapeSystemsHtml(reportText)
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        body.innerHTML = `<p>${html}</p>`;
    }

    if (consultation) {
        consultation.innerHTML = `
            <p>${escapeSystemsHtml(resolveSystemsTemplate(systemsMessages.report.consultationGreeting, templateValues))}</p>
            <p>${escapeSystemsHtml(resolveSystemsTemplate(systemsMessages.report.consultationBody, templateValues))}</p>
        `;
    }

    if (actions) {
        const whatsappMessage = encodeURIComponent(
            resolveSystemsTemplate(systemsMessages.report.whatsappMessage, templateValues)
        );
        actions.innerHTML = `
            <a class="btn whatsapp-btn" href="https://wa.me/?text=${whatsappMessage}" target="_blank" rel="noopener noreferrer">${escapeSystemsHtml(systemsMessages.report.whatsappButton)}</a>
            <button class="btn btn-secondary" onclick="closeSystemsGame()">${escapeSystemsHtml(systemsMessages.report.closeButton)}</button>
        `;
    }
}

async function initSystemsGame() {
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        systemsConfig = normalizeSystemsConfig(data.config && data.config[SYSTEMS_CONFIG_KEY]);
        systemsMessages = normalizeSystemsMessages(data.messages && data.messages[SYSTEMS_MESSAGES_KEY]);
        systemsAllScenarios = Array.isArray(data[SYSTEMS_QUESTIONS_KEY]) ? data[SYSTEMS_QUESTIONS_KEY] : [];

        if (!systemsConfig.quizEnabled || systemsAllScenarios.length === 0) {
            return;
        }

        const launchButton = document.getElementById('systems-launch-btn');
        if (launchButton) {
            launchButton.style.display = '';
        }
    } catch (error) {
        console.warn('[SYSTEMS] Could not load systems diagnostic:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystemsGame);
} else {
    initSystemsGame();
}
