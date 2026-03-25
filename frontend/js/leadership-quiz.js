// Leadership Quiz Modal Logic

let quizState = {
    currentStep: 'name',
    userName: '',
    userEmail: '',
    currentQuestion: 0,
    answers: [],
    questions: []
};

// Open the quiz modal
function openLeadershipQuiz() {
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
        answers: [],
        questions: []
    };
}

// Load questions from backend and initialize
async function loadQuestionsAndInit() {
    try {
        const response = await fetch('/get-questions', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        quizState.questions = data.leadershipAssessment;
        console.log('Questions loaded:', quizState.questions);
        displayStep('name');
    } catch (error) {
        console.error('Failed to load questions:', error);
        alert('Failed to load quiz. Please try again.');
        closeLeadershipQuiz();
    }
}

// Display a specific step
function displayStep(step) {
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
        progressText = `Step 2 of 4: Question ${quizState.currentQuestion + 1} of 10`;
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
    document.getElementById('progress-text').textContent = `Step 2 of 4: Question ${questionNum} of 10`;
    
    // Update question number and progress
    document.getElementById('question-number').textContent = `Question ${questionNum} of 10`;
    const fillPercent = (questionNum / 10) * 100;
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
    document.getElementById('next-btn').textContent = quizState.currentQuestion === 9 ? 'See Results' : 'Next Question';
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
    
    if (quizState.currentQuestion >= 10) {
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
async function quizSubmit() {
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
    const submitBtn = event.target;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating your report...';
    
    try {
        const response = await fetch('/analyze-leadership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: quizState.userName,
                email: quizState.userEmail,
                answers: quizState.answers
            })
        });
        
        if (!response.ok) {
            throw new Error('Server error');
        }
        
        const data = await response.json();
        
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
    document.getElementById('report-content').innerHTML = `
        <div>
            <p><strong>Analysis:</strong></p>
            <p>${reportData.report}</p>
            <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-style: italic;">
                Thank you for taking this assessment. Check your email for the complete report.
            </p>
        </div>
    `;
    displayStep('report');
}
