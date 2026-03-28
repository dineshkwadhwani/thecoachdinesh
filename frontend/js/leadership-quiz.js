// Leadership Quiz Modal Logic

const DEFAULT_QUIZ_CONFIG = {
    quizEnabled: true,
    deepInsightEnabled: true,
    quickQuestionCount: 10,
    deepQuestionCount: 25
};
const QUIZ_CONFIG_KEY = 'reflectYourStyle';
const QUIZ_MESSAGES_KEY = 'reflectYourStyle';
const DEFAULT_QUIZ_MESSAGES = {
    welcome: {
        quickTitle: 'Welcome to Reflect Your Style (Quick)',
        quickStartLabel: 'Start Quick Reflection',
        quickIntro: 'This quick assessment gives you a focused snapshot of your current leadership style.',
        quickPoints: [
            'What to expect: a short set of scenario-based leadership questions.',
            'Output: your dominant style, secondary tendency, and a concise interpretation.',
            'How it helps: identify your natural leadership pattern and immediate improvement focus.'
        ],
        deepTitle: 'Welcome to Reflect Your Style (Deep)',
        deepStartLabel: 'Start Deep Reflection',
        deepIntro: 'This in-depth assessment gives you a richer, executive-level view of your leadership behavior.',
        deepPoints: [
            'What to expect: a deeper set of questions covering multiple leadership situations.',
            'Output: a structured report with dominant/secondary style, strengths, risks, and priorities.',
            'How it helps: clarify blind spots and define a practical leadership development path.'
        ]
    },
    report: {
        quickConsultation: 'This is a small summary report to get you started. If you want more details, do a deep in-depth report. Alternatively, I will be happy to provide voluntary consultance if you need one. Send me a whatsapp.',
        quickConsultationDeepDisabled: 'This is a small summary report to get you started. If you would like to dive deeper, I will be happy to provide voluntary consultance if you need one. Send me a whatsapp.',
        deepConsultation: 'I will be happy to provide one session of voluntary consultation in case you would like to talk to me. Send me a whatsapp message and we can schedule a time.'
    }
};

let quizConfig = { ...DEFAULT_QUIZ_CONFIG };
let quizMessages = JSON.parse(JSON.stringify(DEFAULT_QUIZ_MESSAGES));
let cachedQuizData = null;

function normalizeQuizMessages(rawMessages = {}) {
    const welcomeMessages = rawMessages && typeof rawMessages.welcome === 'object' ? rawMessages.welcome : {};
    const reportMessages = rawMessages && typeof rawMessages.report === 'object' ? rawMessages.report : {};

    return {
        welcome: {
            quickTitle: String(welcomeMessages.quickTitle || DEFAULT_QUIZ_MESSAGES.welcome.quickTitle),
            quickStartLabel: String(welcomeMessages.quickStartLabel || DEFAULT_QUIZ_MESSAGES.welcome.quickStartLabel),
            quickIntro: String(welcomeMessages.quickIntro || DEFAULT_QUIZ_MESSAGES.welcome.quickIntro),
            quickPoints: Array.isArray(welcomeMessages.quickPoints) && welcomeMessages.quickPoints.length > 0
                ? welcomeMessages.quickPoints.map(point => String(point))
                : DEFAULT_QUIZ_MESSAGES.welcome.quickPoints,
            deepTitle: String(welcomeMessages.deepTitle || DEFAULT_QUIZ_MESSAGES.welcome.deepTitle),
            deepStartLabel: String(welcomeMessages.deepStartLabel || DEFAULT_QUIZ_MESSAGES.welcome.deepStartLabel),
            deepIntro: String(welcomeMessages.deepIntro || DEFAULT_QUIZ_MESSAGES.welcome.deepIntro),
            deepPoints: Array.isArray(welcomeMessages.deepPoints) && welcomeMessages.deepPoints.length > 0
                ? welcomeMessages.deepPoints.map(point => String(point))
                : DEFAULT_QUIZ_MESSAGES.welcome.deepPoints
        },
        report: {
            quickConsultation: String(reportMessages.quickConsultation || DEFAULT_QUIZ_MESSAGES.report.quickConsultation),
            quickConsultationDeepDisabled: String(reportMessages.quickConsultationDeepDisabled || DEFAULT_QUIZ_MESSAGES.report.quickConsultationDeepDisabled),
            deepConsultation: String(reportMessages.deepConsultation || DEFAULT_QUIZ_MESSAGES.report.deepConsultation)
        }
    };
}

function createInitialQuizState() {
    return {
        currentStep: 'name',
        welcomeNextStep: 'questions',
        userName: '',
        countryCode: '+91',
        userMobileNumber: '',
        userEmail: '',
        currentQuestion: 0,
        questionCount: quizConfig.quickQuestionCount,
        quizType: 'quick',
        answers: [],
        questions: [],
        allQuestions: []
    };
}

let quizState = createInitialQuizState();

// Open the quiz modal
function openLeadershipQuiz() {
    console.log('[QUIZ] openLeadershipQuiz called');
    const modal = document.getElementById('leadership-quiz-modal');
    modal.style.display = 'flex';
    loadQuestionsAndInit();
}

// Close the quiz modal
function closeLeadershipQuiz() {
    const modal = document.getElementById('leadership-quiz-modal');
    modal.style.display = 'none';
    // Reset state
    quizState = createInitialQuizState();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderDeepExecutiveReport(reportText) {
    const sectionTitles = [
        'Name',
        'Dominant Style',
        'Secondary Style',
        'Comparison With Earlier Report',
        'Style Interpretation',
        'Strengths',
        'Risks And Blind Spots',
        'Development Priorities'
    ];
    const headingPattern = new RegExp(`^(${sectionTitles.join('|')})(:)?\\s*$`);
    const lines = String(reportText || '').split(/\r?\n/);
    const sections = [];
    let currentSection = null;

    lines.forEach(line => {
        const trimmedLine = line.trim();
        const headingMatch = trimmedLine.match(headingPattern);

        if (headingMatch) {
            currentSection = {
                title: headingMatch[1],
                paragraphs: []
            };
            sections.push(currentSection);
            return;
        }

        if (!trimmedLine) {
            return;
        }

        if (!currentSection) {
            currentSection = {
                title: 'Executive Summary',
                paragraphs: []
            };
            sections.push(currentSection);
        }

        currentSection.paragraphs.push(trimmedLine);
    });

    return sections.map(section => `
        <section class="executive-report-section">
            <h3>${escapeHtml(section.title)}</h3>
            ${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </section>
    `).join('');
}

function normalizeQuizConfig(rawConfig = {}) {
    const quickQuestionCount = Number.parseInt(rawConfig.quickQuestionCount, 10);
    const deepQuestionCount = Number.parseInt(rawConfig.deepQuestionCount, 10);

    return {
        quizEnabled: rawConfig.quizEnabled !== false,
        deepInsightEnabled: rawConfig.deepInsightEnabled !== false,
        quickQuestionCount: Number.isInteger(quickQuestionCount) && quickQuestionCount > 0
            ? quickQuestionCount
            : DEFAULT_QUIZ_CONFIG.quickQuestionCount,
        deepQuestionCount: Number.isInteger(deepQuestionCount) && deepQuestionCount > 0
            ? deepQuestionCount
            : DEFAULT_QUIZ_CONFIG.deepQuestionCount
    };
}

// Fetch quiz data once on page load; show quiz button if quizEnabled
async function initQuizFeatureFlags() {
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        cachedQuizData = await response.json();
        const cfg = normalizeQuizConfig(cachedQuizData.config && cachedQuizData.config[QUIZ_CONFIG_KEY]);
        if (cfg.quizEnabled) {
            const btn = document.getElementById('reflect-your-style-btn');
            if (btn) btn.style.display = '';
        }
    } catch (err) {
        console.warn('[QUIZ] Could not load quiz flags on page load:', err);
    }
}

// Load questions from backend and initialize
async function loadQuestionsAndInit() {
    console.log('[QUIZ] loadQuestionsAndInit called');
    try {
        let data = cachedQuizData;
        if (!data) {
            const response = await fetch('/get-questions', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            data = await response.json();
            cachedQuizData = data;
        }
        const allQuestions = Array.isArray(data.reflectYourStyle) ? data.reflectYourStyle : [];
        quizConfig = normalizeQuizConfig(data.config && data.config[QUIZ_CONFIG_KEY]);
        quizMessages = normalizeQuizMessages(data.messages && data.messages[QUIZ_MESSAGES_KEY]);
        const quickQuestionCount = quizConfig.quickQuestionCount;

        if (allQuestions.length < quickQuestionCount) {
            throw new Error(`Not enough questions in pool. Expected at least ${quickQuestionCount}.`);
        }

        quizState.allQuestions = allQuestions;
        quizState.quizType = 'quick';
        quizState.questionCount = quickQuestionCount;
        quizState.currentQuestion = 0;
        quizState.answers = [];
        quizState.userEmail = '';

        quizState.questions = getBalancedRandomQuestions(allQuestions, quickQuestionCount);
        console.log('Questions loaded:', quizState.questions);
        console.log('[QUIZ] Init complete. config:', quizConfig, 'quizType:', quizState.quizType, 'questionCount:', quizState.questionCount);
        quizState.welcomeNextStep = 'questions';
        displayStep('name');
    } catch (error) {
        console.error('Failed to load questions:', error);
        alert('Failed to load quiz. Please try again.');
        closeLeadershipQuiz();
    }
}

function renderWelcomeStep() {
    const isDeep = quizState.quizType === 'deep';
    const title = isDeep ? quizMessages.welcome.deepTitle : quizMessages.welcome.quickTitle;
    const intro = isDeep ? quizMessages.welcome.deepIntro : quizMessages.welcome.quickIntro;
    const points = isDeep ? quizMessages.welcome.deepPoints : quizMessages.welcome.quickPoints;
    const startLabel = isDeep ? quizMessages.welcome.deepStartLabel : quizMessages.welcome.quickStartLabel;

    const welcomeTitleEl = document.getElementById('welcome-title');
    const welcomeCopyEl = document.getElementById('welcome-copy');
    const welcomeStartBtn = document.getElementById('welcome-start-btn');

    if (welcomeTitleEl) {
        welcomeTitleEl.textContent = title;
    }

    if (welcomeCopyEl) {
        const pointsHtml = (points || [])
            .map(point => `<li>${escapeHtml(point)}</li>`)
            .join('');

        welcomeCopyEl.innerHTML = `
            <p>${escapeHtml(intro)}</p>
            <ul>${pointsHtml}</ul>
        `;
    }

    if (welcomeStartBtn) {
        welcomeStartBtn.textContent = startLabel;
    }
}

function startQuizFromWelcome() {
    const nextStep = quizState.welcomeNextStep || 'name';
    displayStep(nextStep);
}

function shuffleQuestions(questions) {
    const shuffled = [...questions];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}

function getRandomQuestions(pool, count) {
    return shuffleQuestions(pool).slice(0, count);
}

// Split the pool into equal bands by position and pick evenly from each band.
// This ensures coverage across the full question bank regardless of tagging.
function getBalancedRandomQuestions(pool, count) {
    const bandCount = 4;
    const basePerBand = Math.floor(count / bandCount);   // 2 for count=10
    const remainder = count % bandCount;                  // 2 extra slots

    const bandSize = Math.ceil(pool.length / bandCount);
    const bands = [];
    for (let i = 0; i < bandCount; i++) {
        bands.push(shuffleQuestions(pool.slice(i * bandSize, (i + 1) * bandSize)));
    }

    const selected = [];

    for (let i = 0; i < bandCount; i++) {
        const quota = basePerBand + (i < remainder ? 1 : 0);
        if (bands[i].length < quota) {
            throw new Error(`Band ${i + 1} has too few questions (${bands[i].length}) for quota ${quota}.`);
        }
        selected.push(...bands[i].slice(0, quota));
    }

    return shuffleQuestions(selected);
}

// Display a specific step
function displayStep(step) {
    console.log('[QUIZ] displayStep:', step, '| quizType:', quizState.quizType, '| questionCount:', quizState.questionCount, '| answers so far:', quizState.answers.length);
    // Hide all steps
    document.getElementById('step-welcome').style.display = 'none';
    document.getElementById('step-name').style.display = 'none';
    document.getElementById('step-questions').style.display = 'none';
    document.getElementById('step-email').style.display = 'none';
    document.getElementById('step-report').style.display = 'none';
    
    // Show the requested step
    document.getElementById('step-' + step).style.display = 'block';
    
    // Update progress bar and text based on step
    let progressPercent = 0;
    let progressText = '';
    
    if (step === 'welcome') {
        progressPercent = 12;
        progressText = 'Step 2 of 5: Welcome';
    } else if (step === 'name') {
        progressPercent = 28;
        progressText = 'Step 1 of 5: Identify Yourself';
    } else if (step === 'questions') {
        progressPercent = 56;
        progressText = `Step 3 of 5: Question ${quizState.currentQuestion + 1} of ${quizState.questionCount}`;
    } else if (step === 'email') {
        progressPercent = 78;
        progressText = 'Step 4 of 5: Share Your Email';
    } else if (step === 'report') {
        progressPercent = 100;
        progressText = 'Step 5 of 5: Your Leadership Report';
    }
    
    document.getElementById('progress-text').textContent = progressText;
    
    const progressFill = document.querySelector('.progress-bar');
    if (progressFill) {
        progressFill.innerHTML = `<div class="progress-bar-fill" style="width: ${progressPercent}%"></div>`;
    }
    
    if (step === 'welcome') {
        renderWelcomeStep();
    }

    if (step === 'name') {
        const nameInput = document.getElementById('user-name-input');
        const countryCodeInput = document.getElementById('user-country-code-input');
        const mobileInput = document.getElementById('user-mobile-input');

        if (nameInput) {
            nameInput.value = quizState.userName || '';
        }

        if (countryCodeInput) {
            countryCodeInput.value = quizState.countryCode || '+91';
        }

        if (mobileInput) {
            mobileInput.value = quizState.userMobileNumber || '';
        }

        // Clean up any existing duplicate notices and restore the continue button
        ['already-taken-notice-quick', 'already-taken-notice-deep'].forEach(function(noticeId) {
            const el = document.getElementById(noticeId);
            if (el) el.style.display = 'none';
        });
        const stepContinueBtn = document.querySelector('#step-name .btn');
        if (stepContinueBtn) stepContinueBtn.style.display = '';
    }

    if (step === 'questions') {
        displayQuestion();
    }

    if (step === 'email') {
        const submitBtn = document.querySelector('#step-email .btn');
        console.log('[QUIZ] Resetting submit button. Found:', submitBtn, 'disabled was:', submitBtn && submitBtn.disabled);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get My Report';
        }
    }
    
    quizState.currentStep = step;
}

// Handle next step (from name input)
async function quizNextStep(from) {
    if (from === 'name') {
        const nameInput = document.getElementById('user-name-input').value.trim();
        const countryCodeInput = document.getElementById('user-country-code-input').value;
        const mobileInputRaw = document.getElementById('user-mobile-input').value.trim();
        const mobileDigits = mobileInputRaw.replace(/\D/g, '');

        if (!nameInput) {
            alert('Please enter your name');
            return;
        }

        if (!countryCodeInput) {
            alert('Please select a country code');
            return;
        }

        if (!/^\d{7,15}$/.test(mobileDigits)) {
            alert('Please enter a valid mobile number (7 to 15 digits).');
            return;
        }

        quizState.userName = nameInput;
        quizState.countryCode = countryCodeInput;
        quizState.userMobileNumber = mobileDigits;

        const fullPhone = `${countryCodeInput}${mobileDigits}`;
        const continueBtn = document.querySelector('#step-name .btn');
        const containerEl = document.getElementById('step-name');

        // Check both quiz types in parallel to handle quick-taken-but-deep-not case
        let quickExists = false;
        let deepExists = false;
        try {
            const [quickResp, deepResp] = await Promise.all([
                fetch(`/check-existing-report?phone=${encodeURIComponent(fullPhone)}&quizType=quick`),
                fetch(`/check-existing-report?phone=${encodeURIComponent(fullPhone)}&quizType=deep`)
            ]);
            if (quickResp.ok) { const qd = await quickResp.json(); quickExists = !!qd.exists; }
            if (deepResp.ok) { const dd = await deepResp.json(); deepExists = !!dd.exists; }
        } catch (_) { /* Network error — allow through */ }

        if (quickExists && !deepExists) {
            // Quick taken but deep not yet — offer the deep test as an alternative
            const whatsappText = encodeURIComponent(
                `Hi Coach, I am ${nameInput} (${fullPhone}). I have already completed the Leadership Style (Quick) assessment. Could you please share my report with me?`
            );
            const noticeId = 'already-taken-notice-quick';
            let noticeEl = document.getElementById(noticeId);
            if (!noticeEl) {
                noticeEl = document.createElement('div');
                noticeEl.id = noticeId;
                noticeEl.style.cssText = 'margin-top:16px;padding:16px;background:#edf4fb;border:1px solid #bdd5ed;border-radius:10px;text-align:center;';
                containerEl.appendChild(noticeEl);
            }
            noticeEl.innerHTML = `
                <p style="margin:0 0 10px;font-weight:600;color:#1d3550;">You have already taken the Quick Leadership Style assessment.</p>
                <p style="margin:0 0 14px;color:#4d6278;font-size:14px;">Send a WhatsApp message to retrieve your quick report, or take the In-Depth assessment now for a richer leadership profile.</p>
                <a class="btn" href="https://wa.me/919767676738?text=${whatsappText}" target="_blank" rel="noopener noreferrer"
                   onclick="sendRetrievalTelegram(${JSON.stringify(nameInput)}, ${JSON.stringify(fullPhone)}, 'quick')"
                   style="display:inline-block;text-decoration:none;margin-right:8px;">Get Quick Report →</a>
                <button class="btn" onclick="proceedToDeepFromNotice()" style="margin-top:8px;">Take In-Depth Assessment →</button>
            `;
            noticeEl.style.display = 'block';
            if (continueBtn) continueBtn.style.display = 'none';
            return;
        }

        if (deepExists) {
            // Deep (and possibly quick) already taken — standard block
            const alreadyTaken = await checkExistingReportAndShowNotice(fullPhone, 'deep', nameInput, containerEl, continueBtn);
            if (alreadyTaken) return;
        }

        quizState.currentQuestion = 0;
        quizState.answers = [];
        quizState.welcomeNextStep = 'questions';
        displayStep('welcome');
    }
}

// Display current question
function proceedToDeepFromNotice() {
    const noticeEl = document.getElementById('already-taken-notice-quick');
    if (noticeEl) noticeEl.style.display = 'none';
    const continueBtn = document.querySelector('#step-name .btn');
    if (continueBtn) continueBtn.style.display = '';
    startInDepthTest();
}

// Display current question
function displayQuestion() {
    if (quizState.currentQuestion >= quizState.questions.length) {
        displayStep('email');
        return;
    }
    
    const q = quizState.questions[quizState.currentQuestion];
    const questionNum = quizState.currentQuestion + 1;
    
    // Update progress text
    document.getElementById('progress-text').textContent = `Step 3 of 5: Question ${questionNum} of ${quizState.questionCount}`;
    
    // Update question number and progress
    document.getElementById('question-number').textContent = `Question ${questionNum} of ${quizState.questionCount}`;
    const fillPercent = (questionNum / quizState.questionCount) * 100;
    document.getElementById('question-progress-fill').style.width = fillPercent + '%';
    
    // Display question
    document.getElementById('question-text').textContent = q.question;
    
    // Display options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    const optionLabels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < optionLabels.length; i++) {
        const label = optionLabels[i];
        const optionText = q.options[label];
        
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = `${label}. ${optionText}`;
        
        // Check if this answer was previously selected
        if (quizState.answers[quizState.currentQuestion] === label) {
            button.classList.add('selected');
        }
        
        button.onclick = () => selectAnswer(label, button);
        optionsContainer.appendChild(button);
    }
    
    // Update button visibility
    document.getElementById('prev-btn').style.display = quizState.currentQuestion === 0 ? 'none' : 'block';
    document.getElementById('next-btn').textContent = quizState.currentQuestion === (quizState.questionCount - 1) ? 'See Results' : 'Next Question';
}

// Select an answer
function selectAnswer(answer, buttonElement) {
    // Remove previous selection
    document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
    
    // Add selection to current button
    buttonElement.classList.add('selected');
    
    // Store answer
    quizState.answers[quizState.currentQuestion] = answer;
}

// Go to next question
function quizNextQuestion() {
    if (!quizState.answers[quizState.currentQuestion]) {
        alert('Please select an answer');
        return;
    }
    
    quizState.currentQuestion++;
    
    if (quizState.currentQuestion >= quizState.questionCount) {
        displayStep('email');
    } else {
        displayQuestion();
    }
}

// Go to previous question
function quizPrevQuestion() {
    if (quizState.currentQuestion > 0) {
        quizState.currentQuestion--;
        displayQuestion();
    }
}

// Submit quiz and get analysis
async function quizSubmit(evt) {
    console.log('[QUIZ] quizSubmit called. quizType:', quizState.quizType, 'answers:', quizState.answers.length, 'questionCount:', quizState.questionCount);
    const emailInput = document.getElementById('user-email-input').value.trim();
    if (!emailInput) {
        alert('Please enter your email');
        return;
    }
    
    if (!emailInput.includes('@')) {
        alert('Please enter a valid email');
        return;
    }
    
    quizState.userEmail = emailInput;
    
    // Show loading state
    const submitBtn = (evt && evt.target) || document.getElementById('submit-report-btn');
    console.log('[QUIZ] submitBtn found:', submitBtn);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating your report...';
    
    try {
        console.log('[QUIZ] Sending fetch to /analyze-leadership. Payload size:', quizState.answers.length, 'answers');
        const response = await fetch('/analyze-leadership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: quizState.userName,
                mobile: `${quizState.countryCode}${quizState.userMobileNumber}`,
                email: quizState.userEmail,
                answers: quizState.answers,
                quizType: quizState.quizType
            })
        });
        
        if (!response.ok) {
            throw new Error('Server error');
        }
        
        const data = await response.json();

        console.log('[QUIZ] Got response from server:', data.dominantStyle);
        // Display report
        displayReport({
            name: data.name || quizState.userName,
            dominantStyle: data.dominantStyle,
            secondaryStyle: data.secondaryStyle,
            report: data.report
        });
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Failed to generate report. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get My Report';
    }
}

// Display the generated report
function displayReport(reportData) {
    document.getElementById('report-title').textContent = quizState.quizType === 'deep'
        ? `${reportData.name || quizState.userName}: Leadership Style, Deep Analysis`
        : `Your Leadership Style: ${reportData.dominantStyle}`;

    const cleanedReport = (reportData.report || '')
        .replace(/Contact Coach Dinesh for your full 25-question Executive Assessment to go deeper into your leadership impact\.?/gi, '')
        .replace(/Want a much deeper evaluation\. Take a indepth test across multiple scenarios\.?/gi, '')
        .trim();
    const formattedReport = quizState.quizType === 'deep'
        ? renderDeepExecutiveReport(cleanedReport)
        : cleanedReport
            .split(/\n{2,}/)
            .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
            .join('');
    const styleSummary = quizState.quizType === 'deep'
        ? `<div class="executive-report-summary">
                <p><strong>Name:</strong> ${escapeHtml(reportData.name || quizState.userName)}</p>
                <p><strong>Dominant Style:</strong> ${escapeHtml(reportData.dominantStyle)}</p>
                <p><strong>Secondary Style:</strong> ${escapeHtml(reportData.secondaryStyle || 'Not significant enough to call out')}</p>
           </div>`
        : '';

    const participantName = escapeHtml(reportData.name || quizState.userName);
    const whatsappMessage = quizState.quizType === 'quick'
        ? `Hey Coach, my name is ${participantName}. I completed the quick summary report and want to discuss next steps.`
        : `Hey Coach, my name is ${participantName}. I want to talk.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    const showDeepButton = quizState.quizType === 'quick' && quizConfig.deepInsightEnabled;
    const deepActionButton = showDeepButton
        ? `<button class="btn" onclick="startInDepthTest()">Deep Executive Analysis</button>`
        : '';

    let consultationBody;
    if (quizState.quizType === 'quick') {
        consultationBody = quizConfig.deepInsightEnabled
            ? quizMessages.report.quickConsultation
            : quizMessages.report.quickConsultationDeepDisabled;
    } else {
        consultationBody = quizMessages.report.deepConsultation;
    }

    const closeButton = quizState.quizType === 'deep'
        ? `<button class="btn btn-secondary" onclick="closeLeadershipQuiz()">Close</button>`
        : '';

    const reportFooter = `
        <div class="report-signoff">
            <img src="images/signature.png" alt="Dinesh Wadhwani Signature" class="signature-image" onerror="this.style.display='none'">
            <p class="signature-name">Dinesh Wadhwani</p>
        </div>
        <div class="consultation-message">
            <p>Dear ${participantName},</p>
            <p>${consultationBody}</p>
        </div>
        <div class="report-actions-row">
            ${deepActionButton}
            <a class="btn whatsapp-btn" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">Send WhatsApp</a>
            ${closeButton}
        </div>
    `;

    document.getElementById('report-content').innerHTML = `
        <div>
            ${styleSummary}
            <p><strong>Analysis:</strong></p>
            ${formattedReport}
            ${reportFooter}
        </div>
    `;
    displayStep('report');
}

function startInDepthTest() {
    console.log('[QUIZ] startInDepthTest called. allQuestions pool size:', quizState.allQuestions.length);
    const deepQuestionCount = quizConfig.deepQuestionCount;

    if (!Array.isArray(quizState.allQuestions) || quizState.allQuestions.length < deepQuestionCount) {
        alert(`Not enough questions for in-depth test. Need at least ${deepQuestionCount}.`);
        return;
    }

    const quickQuestionKeys = new Set(
        (quizState.questions || []).map(question => question.id ?? question.question)
    );
    const remainingQuestions = quizState.allQuestions.filter(
        question => !quickQuestionKeys.has(question.id ?? question.question)
    );

    console.log('[QUIZ] deep test pool after excluding quick questions:', remainingQuestions.length);
    if (remainingQuestions.length < deepQuestionCount) {
        alert(`Not enough unique questions left for in-depth test. Need ${deepQuestionCount}, found ${remainingQuestions.length}.`);
        return;
    }

    quizState.quizType = 'deep';
    quizState.questionCount = deepQuestionCount;
    quizState.currentQuestion = 0;
    quizState.answers = [];
    quizState.userEmail = '';
    quizState.questions = getRandomQuestions(remainingQuestions, deepQuestionCount);
    quizState.welcomeNextStep = 'questions';

    const emailInput = document.getElementById('user-email-input');
    if (emailInput) {
        emailInput.value = '';
    }

    displayStep('welcome');
}

// Run on page load to apply feature flags and show/hide the quiz button
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuizFeatureFlags);
} else {
    initQuizFeatureFlags();
}
