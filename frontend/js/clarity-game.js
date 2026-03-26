// ================================================================
// Strategic Clarity Diagnostic — Game Logic
// Entirely independent from leadership-quiz.js
// ================================================================

const DEFAULT_CLARITY_CONFIG = {
    quizEnabled: true,
    scenarioCount: 5
};
const CLARITY_CONFIG_KEY = 'strategicClarity';
const CLARITY_MESSAGES_KEY = 'strategicClarity';
const CLARITY_QUESTIONS_KEY = 'clarityAssessment';
const DEFAULT_CLARITY_MESSAGES = {
    welcome: {
        title: 'Welcome to the Clarity Challenge',
        intro: 'Leaders are bombarded with noise. Your task is to identify the signals that matter and remove the noise.',
        scenarioInstruction: 'You will face {scenarioCount} real-world leadership scenarios. Each scenario contains a mix of noise and signals. Click on the items you think are noise to dismiss them.',
        outcome: 'Outcome: We will measure your Clarity Quotient and identify your strategic blindspots.',
        startButton: 'Start the Challenge →'
    },
    progress: {
        identity: 'Step 1 of 5: Identify Yourself',
        welcome: 'Step 2 of 5: The Challenge',
        game: 'Scenario {current} of {total}',
        email: 'Step 4 of 5: Capture Your Report',
        loading: 'Analysing your Clarity Quotient...',
        report: 'Your Strategic Clarity Report'
    },
    labels: {
        scenario: 'Scenario {current} of {total}',
        nextScenarioButton: 'Next Scenario →',
        getReportButton: 'Get My Report →'
    },
    report: {
        title: 'Your Strategic Clarity Report, {name}',
        consultationGreeting: 'Dear {name},',
        consultationBody: 'Thank you for completing the Strategic Clarity Diagnostic. I would love to offer you a complimentary 1-on-1 Clarity Session to explore your blindspots further. Send me a WhatsApp and we can find a time that works.',
        whatsappMessage: "Hey Coach, my name is {name}. I completed the Strategic Clarity Diagnostic and scored {noiseScore}% on the Clarity Quotient. I'd love to discuss my results.",
        whatsappButton: 'Send WhatsApp',
        closeButton: 'Close'
    }
};

// ---- State ----
let clarityConfig = { ...DEFAULT_CLARITY_CONFIG };
let clarityMessages = JSON.parse(JSON.stringify(DEFAULT_CLARITY_MESSAGES));
let clarityState = createInitialClarityState();
let clarityAllScenarios = [];

function createInitialClarityState() {
    return {
        step: 'identity',   // identity | welcome | game | email | loading | report
        userName: '',
        countryCode: '+91',
        userPhone: '',
        userEmail: '',
        scenarios: [],      // 5 randomly selected scenarios
        currentScenario: 0,
        // Per-scenario tracking: { noiseCleared, signalsMissed }
        results: [],
        totalNoiseCleared: 0,
        totalSignalsMissed: 0,
        totalNoise: 0,
        totalSignals: 0
    };
}

// ---- Helpers ----
function escapeHtmlClarity(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function normalizeClarityConfig(rawConfig = {}) {
    const scenarioCount = Number.parseInt(rawConfig.scenarioCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        scenarioCount: Number.isInteger(scenarioCount) && scenarioCount > 0
            ? scenarioCount
            : DEFAULT_CLARITY_CONFIG.scenarioCount
    };
}

function normalizeClarityMessages(rawMessages = {}) {
    const welcomeMessages = rawMessages && typeof rawMessages.welcome === 'object' ? rawMessages.welcome : {};
    const progressMessages = rawMessages && typeof rawMessages.progress === 'object' ? rawMessages.progress : {};
    const labelMessages = rawMessages && typeof rawMessages.labels === 'object' ? rawMessages.labels : {};
    const reportMessages = rawMessages && typeof rawMessages.report === 'object' ? rawMessages.report : {};

    return {
        welcome: {
            title: String(welcomeMessages.title || DEFAULT_CLARITY_MESSAGES.welcome.title),
            intro: String(welcomeMessages.intro || DEFAULT_CLARITY_MESSAGES.welcome.intro),
            scenarioInstruction: String(welcomeMessages.scenarioInstruction || DEFAULT_CLARITY_MESSAGES.welcome.scenarioInstruction),
            outcome: String(welcomeMessages.outcome || DEFAULT_CLARITY_MESSAGES.welcome.outcome),
            startButton: String(welcomeMessages.startButton || DEFAULT_CLARITY_MESSAGES.welcome.startButton)
        },
        progress: {
            identity: String(progressMessages.identity || DEFAULT_CLARITY_MESSAGES.progress.identity),
            welcome: String(progressMessages.welcome || DEFAULT_CLARITY_MESSAGES.progress.welcome),
            game: String(progressMessages.game || DEFAULT_CLARITY_MESSAGES.progress.game),
            email: String(progressMessages.email || DEFAULT_CLARITY_MESSAGES.progress.email),
            loading: String(progressMessages.loading || DEFAULT_CLARITY_MESSAGES.progress.loading),
            report: String(progressMessages.report || DEFAULT_CLARITY_MESSAGES.progress.report)
        },
        labels: {
            scenario: String(labelMessages.scenario || DEFAULT_CLARITY_MESSAGES.labels.scenario),
            nextScenarioButton: String(labelMessages.nextScenarioButton || DEFAULT_CLARITY_MESSAGES.labels.nextScenarioButton),
            getReportButton: String(labelMessages.getReportButton || DEFAULT_CLARITY_MESSAGES.labels.getReportButton)
        },
        report: {
            title: String(reportMessages.title || DEFAULT_CLARITY_MESSAGES.report.title),
            consultationGreeting: String(reportMessages.consultationGreeting || DEFAULT_CLARITY_MESSAGES.report.consultationGreeting),
            consultationBody: String(reportMessages.consultationBody || DEFAULT_CLARITY_MESSAGES.report.consultationBody),
            whatsappMessage: String(reportMessages.whatsappMessage || DEFAULT_CLARITY_MESSAGES.report.whatsappMessage),
            whatsappButton: String(reportMessages.whatsappButton || DEFAULT_CLARITY_MESSAGES.report.whatsappButton),
            closeButton: String(reportMessages.closeButton || DEFAULT_CLARITY_MESSAGES.report.closeButton)
        }
    };
}

function resolveClarityTemplate(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, (fullMatch, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return String(values[key]);
        }
        return fullMatch;
    });
}

function getConfiguredScenarioCount() {
    return clarityConfig.scenarioCount;
}

function getActiveScenarioCount() {
    return Math.min(getConfiguredScenarioCount(), clarityAllScenarios.length);
}

// ---- Modal open / close ----
function openClarityGame() {
    const modal = document.getElementById('clarity-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    clarityState = createInitialClarityState();
    clarityDisplayStep('identity');
}

function closeClarityGame() {
    const modal = document.getElementById('clarity-modal');
    if (modal) modal.style.display = 'none';
    clarityState = createInitialClarityState();
}

// ---- Step rendering dispatcher ----
function clarityDisplayStep(step) {
    clarityState.step = step;

    const steps = ['identity', 'welcome', 'game', 'email', 'loading', 'report'];
    steps.forEach(s => {
        const el = document.getElementById(`clarity-step-${s}`);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(`clarity-step-${step}`);
    if (target) target.style.display = 'block';

    clarityUpdateProgress(step);

    if (step === 'welcome') clarityRenderWelcome();
    if (step === 'game')    clarityRenderScenario();
    if (step === 'loading') clarityStartAnalysis();
    if (step === 'report')  { /* rendered by analysis callback */ }
}

function clarityUpdateProgress(step) {
    const progressText = document.getElementById('clarity-progress-text');
    const progressBar  = document.getElementById('clarity-progress-bar-fill');
    const activeScenarioCount = Math.max(getActiveScenarioCount(), 1);
    if (!progressText || !progressBar) return;

    const map = {
        identity: { text: clarityMessages.progress.identity, pct: 10 },
        welcome:  { text: clarityMessages.progress.welcome, pct: 25 },
        game:     {
            text: resolveClarityTemplate(clarityMessages.progress.game, {
                current: clarityState.currentScenario + 1,
                total: activeScenarioCount
            }),
            pct: 25 + Math.round(((clarityState.currentScenario) / activeScenarioCount) * 50)
        },
        email:    { text: clarityMessages.progress.email, pct: 80 },
        loading:  { text: clarityMessages.progress.loading, pct: 90 },
        report:   { text: clarityMessages.progress.report, pct: 100 }
    };
    const m = map[step] || { text: '', pct: 0 };
    progressText.textContent = m.text;
    progressBar.style.width = `${m.pct}%`;
}

// ---- Identity Step ----
function clarityNextFromIdentity() {
    const nameEl    = document.getElementById('clarity-name-input');
    const ccEl      = document.getElementById('clarity-country-code');
    const phoneEl   = document.getElementById('clarity-phone-input');

    if (!nameEl || !ccEl || !phoneEl) return;

    const name  = nameEl.value.trim();
    const cc    = ccEl.value;
    const phone = phoneEl.value.trim().replace(/\D/g, '');
    const namePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;

    if (!name || !namePattern.test(name)) {
        alert('Please enter a valid name.');
        nameEl.focus();
        return;
    }
    if (!cc) {
        alert('Please select a country code.');
        ccEl.focus();
        return;
    }
    if (!/^\d{7,15}$/.test(phone)) {
        alert('Please enter a valid mobile number (7–15 digits).');
        phoneEl.focus();
        return;
    }

    clarityState.userName    = name;
    clarityState.countryCode = cc;
    clarityState.userPhone   = `${cc}${phone}`;
    clarityDisplayStep('welcome');
}

// ---- Welcome Step ----
function clarityRenderWelcome() {
    const welcomeStepEl = document.querySelector('#clarity-step-welcome h2');
    const welcomeCopyEl = document.querySelector('#clarity-step-welcome .clarity-welcome-copy');
    const welcomeStartButtonEl = document.querySelector('#clarity-step-welcome .btn');
    const scenarioCountCopyEl = document.getElementById('clarity-scenario-count-copy');
    const configuredScenarioCount = getConfiguredScenarioCount();

    if (welcomeStepEl) {
        welcomeStepEl.textContent = clarityMessages.welcome.title;
    }

    if (welcomeCopyEl) {
        welcomeCopyEl.innerHTML = `
            <p>${escapeHtmlClarity(clarityMessages.welcome.intro)}</p>
            <p>${escapeHtmlClarity(resolveClarityTemplate(clarityMessages.welcome.scenarioInstruction, {
                scenarioCount: configuredScenarioCount
            }))}</p>
            <p>${escapeHtmlClarity(clarityMessages.welcome.outcome)}</p>
        `;
    }

    if (welcomeStartButtonEl) {
        welcomeStartButtonEl.textContent = clarityMessages.welcome.startButton;
    }

    if (scenarioCountCopyEl) {
        scenarioCountCopyEl.textContent = resolveClarityTemplate(clarityMessages.welcome.scenarioInstruction, {
            scenarioCount: configuredScenarioCount
        });
    }
}

function clarityStartGame() {
    if (clarityAllScenarios.length === 0) {
        alert('Scenarios are still loading. Please try again in a moment.');
        return;
    }

    const activeScenarioCount = getActiveScenarioCount();
    if (activeScenarioCount === 0) {
        alert('No scenarios are available right now. Please try again later.');
        return;
    }

    const shuffled = shuffleArray(clarityAllScenarios);
    clarityState.scenarios = shuffled.slice(0, activeScenarioCount);
    clarityState.currentScenario = 0;
    clarityState.results = [];
    clarityState.totalNoiseCleared = 0;
    clarityState.totalSignalsMissed = 0;
    clarityState.totalNoise = 0;
    clarityState.totalSignals = 0;
    clarityDisplayStep('game');
}

// ---- Game Step ----
function clarityRenderScenario() {
    const idx = clarityState.currentScenario;
    const scenario = clarityState.scenarios[idx];
    if (!scenario) return;

    // Count totals for this scenario
    const noiseItems   = scenario.items.filter(i => !i.isSignal);
    const signalItems  = scenario.items.filter(i => i.isSignal);

    // Track totals across all scenarios
    clarityState.totalNoise   += noiseItems.length;
    clarityState.totalSignals += signalItems.length;

    // Push a blank result entry for this scenario
    clarityState.results.push({ noiseCleared: 0, signalsMissed: 0 });

    const labelEl   = document.getElementById('clarity-scenario-label');
    const contextEl = document.getElementById('clarity-context-text');
    const tagsEl    = document.getElementById('clarity-tags-area');
    const nextBtn   = document.getElementById('clarity-next-scenario-btn');

    const activeScenarioCount = clarityState.scenarios.length;

    if (labelEl) {
        labelEl.textContent = resolveClarityTemplate(clarityMessages.labels.scenario, {
            current: idx + 1,
            total: activeScenarioCount
        });
    }
    if (contextEl) contextEl.textContent = scenario.context;
    if (nextBtn) {
        nextBtn.textContent = idx < activeScenarioCount - 1
            ? clarityMessages.labels.nextScenarioButton
            : clarityMessages.labels.getReportButton;
        nextBtn.disabled = false;
    }

    if (!tagsEl) return;
    tagsEl.innerHTML = '';

    // Shuffle items for display
    const shuffledItems = shuffleArray(scenario.items);
    shuffledItems.forEach((item, itemIdx) => {
        const tag = document.createElement('button');
        tag.className = 'clarity-tag';
        tag.textContent = item.label;
        tag.dataset.isSignal = item.isSignal ? 'true' : 'false';
        tag.dataset.itemIdx  = itemIdx;
        tag.type = 'button';
        tag.setAttribute('aria-label', item.label);

        tag.addEventListener('click', () => clarityHandleTagClick(tag, item, idx));
        tagsEl.appendChild(tag);
    });
}

function clarityHandleTagClick(tagEl, item, scenarioIdx) {
    if (tagEl.classList.contains('dismissed-noise') || tagEl.classList.contains('dismissed-signal')) return;

    const result = clarityState.results[scenarioIdx];
    if (!result) return;

    if (!item.isSignal) {
        // Correct — this IS noise
        result.noiseCleared++;
        clarityState.totalNoiseCleared++;
        tagEl.classList.add('dismissed-noise');
        // Remove from DOM after transition
        setTimeout(() => { if (tagEl.parentNode) tagEl.parentNode.removeChild(tagEl); }, 420);
    } else {
        // Wrong — this IS a signal
        result.signalsMissed++;
        clarityState.totalSignalsMissed++;
        tagEl.classList.add('dismissed-signal');
    }
}

function clarityNextScenario() {
    const idx = clarityState.currentScenario;

    // Capture any unclicked noise as missed opportunities (not penalised, just not cleared)
    // Signal clicks are always tracked immediately on click above.

    clarityState.currentScenario++;

    if (clarityState.currentScenario < clarityState.scenarios.length) {
        clarityUpdateProgress('game');
        clarityRenderScenario();
    } else {
        clarityDisplayStep('email');
    }
}

// ---- Email Step ----
function claritySubmitEmail() {
    const emailEl = document.getElementById('clarity-email-input');
    if (!emailEl) return;

    const email = emailEl.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        emailEl.focus();
        return;
    }
    clarityState.userEmail = email;
    clarityDisplayStep('loading');
}

// ---- Analysis (POST to backend) ----
async function clarityStartAnalysis() {
    const { userName, userPhone, userEmail, totalNoiseCleared, totalSignalsMissed, totalNoise, totalSignals } = clarityState;
    const noiseScore = totalNoise > 0 ? Math.round((totalNoiseCleared / totalNoise) * 100) : 0;

    try {
        const response = await fetch('/analyze-clarity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                phone: userPhone,
                email: userEmail,
                noiseCleared: totalNoiseCleared,
                signalsMissed: totalSignalsMissed,
                totalNoise,
                totalSignals,
                noiseScore
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server error ${response.status}`);
        }

        const data = await response.json();
        clarityRenderReport(data);
        clarityDisplayStep('report');
    } catch (err) {
        console.error('[CLARITY] Analysis error:', err);
        alert('Failed to generate your report. Please try again.');
        clarityDisplayStep('email');
    }
}

// ---- Report Rendering ----
function clarityRenderReport(data) {
    const { userName, userEmail, totalNoiseCleared, totalSignalsMissed, totalNoise, totalSignals } = clarityState;
    const noiseScore = totalNoise > 0 ? Math.round((totalNoiseCleared / totalNoise) * 100) : 0;

    const reportTitleEl   = document.getElementById('clarity-report-title');
    const scoreSummaryEl  = document.getElementById('clarity-score-summary');
    const reportBodyEl    = document.getElementById('clarity-report-body');
    const consultationEl  = document.getElementById('clarity-consultation');
    const actionsEl       = document.getElementById('clarity-report-actions');

    if (reportTitleEl) {
        reportTitleEl.textContent = resolveClarityTemplate(clarityMessages.report.title, {
            name: userName,
            noiseScore
        });
    }

    if (scoreSummaryEl) {
        scoreSummaryEl.innerHTML = `
            <span class="clarity-score-pill quotient">🎯 Clarity Quotient: ${noiseScore}%</span>
            <span class="clarity-score-pill cleared">✓ Noise Cleared: ${totalNoiseCleared} / ${totalNoise}</span>
            <span class="clarity-score-pill missed">✕ Signals Missed: ${totalSignalsMissed} / ${totalSignals}</span>
        `;
    }

    if (reportBodyEl && data.report) {
        // Convert markdown-style headings and newlines to HTML
        let html = escapeHtmlClarity(data.report)
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        reportBodyEl.innerHTML = `<p>${html}</p>`;
    }

    if (consultationEl) {
        consultationEl.innerHTML = `
            <p>${escapeHtmlClarity(resolveClarityTemplate(clarityMessages.report.consultationGreeting, {
                name: userName,
                noiseScore
            }))}</p>
            <p>${escapeHtmlClarity(resolveClarityTemplate(clarityMessages.report.consultationBody, {
                name: userName,
                noiseScore
            }))}</p>
        `;
    }

    if (actionsEl) {
        const waMsg = encodeURIComponent(resolveClarityTemplate(clarityMessages.report.whatsappMessage, {
            name: userName,
            noiseScore
        }));
        const waUrl = `https://wa.me/?text=${waMsg}`;
        actionsEl.innerHTML = `
            <a class="btn whatsapp-btn" href="${waUrl}" target="_blank" rel="noopener noreferrer">${escapeHtmlClarity(clarityMessages.report.whatsappButton)}</a>
            <button class="btn btn-secondary" onclick="closeClarityGame()">${escapeHtmlClarity(clarityMessages.report.closeButton)}</button>
        `;
    }
}

// ---- Load scenarios on page load ----
async function initClarityGame() {
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const scenarios = data[CLARITY_QUESTIONS_KEY];
        clarityConfig = normalizeClarityConfig(data.config && data.config[CLARITY_CONFIG_KEY]);
        clarityMessages = normalizeClarityMessages(data.messages && data.messages[CLARITY_MESSAGES_KEY]);

        if (Array.isArray(scenarios) && scenarios.length > 0) {
            clarityAllScenarios = scenarios;
            const btn = document.getElementById('clarity-launch-btn');
            if (btn && clarityConfig.quizEnabled) btn.style.display = '';
        }
    } catch (err) {
        console.warn('[CLARITY] Could not load scenarios on page load:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClarityGame);
} else {
    initClarityGame();
}
