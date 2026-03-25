// Leadership Quiz Modal Logic

const QUICK_QUESTION_COUNT = 10;
const DEEP_QUESTION_COUNT = 25;

let quizState = {
    currentStep: 'name',
    userName: '',
    userEmail: '',
    currentQuestion: 0,
    questionCount: QUICK_QUESTION_COUNT,
    quizType: 'quick',
    answers: [],
    questions: [],
    allQuestions: []
};

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
    quizState = {
        currentStep: 'name',
        userName: '',
        userEmail: '',
        currentQuestion: 0,
        questionCount: QUICK_QUESTION_COUNT,
        quizType: 'quick',
        answers: [],
        questions: [],
        allQuestions: []
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

        if (allQuestions.length < QUICK_QUESTION_COUNT) {
            throw new Error(`Not enough questions in pool. Expected at least ${QUICK_QUESTION_COUNT}.`);
        }

        quizState.allQuestions = allQuestions;
        quizState.quizType = 'quick';
        quizState.questionCount = QUICK_QUESTION_COUNT;
        quizState.currentQuestion = 0;
        quizState.answers = [];
        quizState.userEmail = '';

        quizState.questions = getBalancedRandomQuestions(allQuestions, QUICK_QUESTION_COUNT);
        console.log('Questions loaded:', quizState.questions);
        console.log('[QUIZ] Init complete. quizType:', quizState.quizType, 'questionCount:', quizState.questionCount);
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
        if (!nameInput) {
            alert('Please enter your name');
            return;
        }
        quizState.userName = nameInput;
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
            dominantStyle: data.dominantStyle,
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
    document.getElementById('report-title').textContent = `Your Leadership Style: ${reportData.dominantStyle}`;

    const cleanedReport = (reportData.report || '')
        .replace(/Contact Coach Dinesh for your full 25-question Executive Assessment to go deeper into your leadership impact\.?/gi, '')
        .trim();

    const deepTestCta = quizState.quizType === 'quick'
        ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                <p style="font-style: italic; margin-bottom: 12px;">Want a much deeper evaluation. Take a indepth test across multiple scenarios.</p>
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
            <p><strong>Analysis:</strong></p>
            <p>${cleanedReport}</p>
            ${deepTestCta}
        </div>
    `;
    displayStep('report');
}

function startInDepthTest() {
    console.log('[QUIZ] startInDepthTest called. allQuestions pool size:', quizState.allQuestions.length);
    if (!Array.isArray(quizState.allQuestions) || quizState.allQuestions.length < DEEP_QUESTION_COUNT) {
        alert(`Not enough questions for in-depth test. Need at least ${DEEP_QUESTION_COUNT}.`);
        return;
    }

    const quickQuestionKeys = new Set(
        (quizState.questions || []).map(question => question.id ?? question.question)
    );
    const remainingQuestions = quizState.allQuestions.filter(
        question => !quickQuestionKeys.has(question.id ?? question.question)
    );

    console.log('[QUIZ] deep test pool after excluding quick questions:', remainingQuestions.length);
    if (remainingQuestions.length < DEEP_QUESTION_COUNT) {
        alert(`Not enough unique questions left for in-depth test. Need ${DEEP_QUESTION_COUNT}, found ${remainingQuestions.length}.`);
        return;
    }

    quizState.quizType = 'deep';
    quizState.questionCount = DEEP_QUESTION_COUNT;
    quizState.currentQuestion = 0;
    quizState.answers = [];
    quizState.userEmail = '';
    quizState.questions = getRandomQuestions(remainingQuestions, DEEP_QUESTION_COUNT);

    const emailInput = document.getElementById('user-email-input');
    if (emailInput) {
        emailInput.value = '';
    }

    displayStep('questions');
}
