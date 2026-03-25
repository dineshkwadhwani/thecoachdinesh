// Leadership Quiz Modal Logic

const DEFAULT_QUIZ_CONFIG = {
    quickQuestionCount: 10,
    deepQuestionCount: 25
};
const QUIZ_CONFIG_KEY = 'reflectYourStyle';

let quizConfig = { ...DEFAULT_QUIZ_CONFIG };

function createInitialQuizState() {
    return {
        currentStep: 'name',
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
        quickQuestionCount: Number.isInteger(quickQuestionCount) && quickQuestionCount > 0
            ? quickQuestionCount
            : DEFAULT_QUIZ_CONFIG.quickQuestionCount,
        deepQuestionCount: Number.isInteger(deepQuestionCount) && deepQuestionCount > 0
            ? deepQuestionCount
            : DEFAULT_QUIZ_CONFIG.deepQuestionCount
    };
}

// Load questions from backend and initialize
async function loadQuestionsAndInit() {
    console.log('[QUIZ] loadQuestionsAndInit called');
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const allQuestions = Array.isArray(data.reflectYourStyle) ? data.reflectYourStyle : [];
        quizConfig = normalizeQuizConfig(data.config && data.config[QUIZ_CONFIG_KEY]);
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
        displayStep('name');
    } catch (error) {
        console.error('Failed to load questions:', error);
        alert('Failed to load quiz. Please try again.');
        closeLeadershipQuiz();
    }
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
    document.getElementById('step-name').style.display = 'none';
    document.getElementById('step-questions').style.display = 'none';
    document.getElementById('step-email').style.display = 'none';
    document.getElementById('step-report').style.display = 'none';
    
    // Show the requested step
    document.getElementById('step-' + step).style.display = 'block';
    
    // Update progress bar and text based on step
    let progressPercent = 0;
    let progressText = '';
    
    if (step === 'name') {
        progressPercent = 25;
        progressText = 'Step 1 of 4: Identify Yourself';
    } else if (step === 'questions') {
        progressPercent = 50;
        progressText = `Step 2 of 4: Question ${quizState.currentQuestion + 1} of ${quizState.questionCount}`;
    } else if (step === 'email') {
        progressPercent = 75;
        progressText = 'Step 3 of 4: Share Your Email';
    } else if (step === 'report') {
        progressPercent = 100;
        progressText = 'Step 4 of 4: Your Leadership Report';
    }
    
    document.getElementById('progress-text').textContent = progressText;
    
    const progressFill = document.querySelector('.progress-bar');
    if (progressFill) {
        progressFill.innerHTML = `<div class="progress-bar-fill" style="width: ${progressPercent}%"></div>`;
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
function quizNextStep(from) {
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
        quizState.currentQuestion = 0;
        quizState.answers = [];
        displayStep('questions');
    }
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
    document.getElementById('progress-text').textContent = `Step 2 of 4: Question ${questionNum} of ${quizState.questionCount}`;
    
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

    const deepTestCta = quizState.quizType === 'quick'
        ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <button class="btn" onclick="startInDepthTest()">Deep Executive Analysis</button>
                    <button class="btn btn-secondary" onclick="closeLeadershipQuiz()">Close</button>
                </div>
           </div>`
        : `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; display:flex; justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="closeLeadershipQuiz()">Close</button>
           </div>`;

    document.getElementById('report-content').innerHTML = `
        <div>
            ${styleSummary}
            <p><strong>Analysis:</strong></p>
            ${formattedReport}
            ${deepTestCta}
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

    const emailInput = document.getElementById('user-email-input');
    if (emailInput) {
        emailInput.value = '';
    }

    displayStep('questions');
}
