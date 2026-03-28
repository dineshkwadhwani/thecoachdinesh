let transformationState = createInitialTransformationState();

function createInitialTransformationState() {
    return {
        step: 'identity',
        name: '',
        phone: '',
        plan: null,
        generatedAt: '',
        sourceReports: [],
        assessmentSnapshot: null
    };
}

function escapeTransformationHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeTransformationPhone(countryCode, rawPhone) {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!/^\d{7,15}$/.test(digits)) {
        throw new Error('Please enter a valid mobile number (7–15 digits).');
    }
    return `${countryCode}${digits}`;
}

function openTransformationPlan() {
    const modal = document.getElementById('transformation-modal');
    if (!modal) return;

    transformationState = createInitialTransformationState();
    transformationShowStep('identity');
    transformationSetMessage('', false);
    modal.style.display = 'flex';
}

function closeTransformationPlan() {
    const modal = document.getElementById('transformation-modal');
    if (modal) modal.style.display = 'none';
    transformationState = createInitialTransformationState();
}

function transformationShowStep(step) {
    transformationState.step = step;
    const modalContent = document.querySelector('#transformation-modal .transformation-modal-content');
    if (modalContent) {
        modalContent.classList.toggle('report-mode', step === 'report');
    }

    ['identity', 'loading', 'report'].forEach((stepName) => {
        const el = document.getElementById(`transformation-step-${stepName}`);
        if (el) el.style.display = 'none';
    });

    const currentStep = document.getElementById(`transformation-step-${step}`);
    if (currentStep) currentStep.style.display = 'block';

    const progressText = document.getElementById('transformation-progress-text');
    const progressFill = document.getElementById('transformation-progress-fill');

    const map = {
        identity: { text: 'Step 1 of 3: Identify Yourself', pct: 15 },
        loading: { text: 'Step 2 of 3: Building Your Plan', pct: 70 },
        report: { text: 'Step 3 of 3: Your Transformation Plan', pct: 100 }
    };

    const current = map[step] || map.identity;
    if (progressText) progressText.textContent = current.text;
    if (progressFill) progressFill.style.width = `${current.pct}%`;
}

function transformationSetMessage(message, isError) {
    const messageEl = document.getElementById('transformation-identity-message');
    if (!messageEl) return;

    if (!message) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
        messageEl.classList.remove('error');
        return;
    }

    messageEl.style.display = 'block';
    messageEl.textContent = message;
    messageEl.classList.toggle('error', Boolean(isError));
}

async function generateTransformationPlan() {
    const nameInput = document.getElementById('transformation-name-input');
    const countryCodeInput = document.getElementById('transformation-country-code');
    const phoneInput = document.getElementById('transformation-phone-input');
    const generateButton = document.getElementById('transformation-generate-btn');

    if (!nameInput || !countryCodeInput || !phoneInput || !generateButton) {
        return;
    }

    const name = String(nameInput.value || '').trim();
    const countryCode = countryCodeInput.value;
    const namePattern = /^[A-Za-z][A-Za-z .'-]{1,}$/;

    if (!name || !namePattern.test(name)) {
        transformationSetMessage('Please enter a valid name.', true);
        nameInput.focus();
        return;
    }

    let normalizedPhone = '';
    try {
        normalizedPhone = normalizeTransformationPhone(countryCode, phoneInput.value);
    } catch (error) {
        transformationSetMessage(error.message || 'Please enter a valid phone number.', true);
        phoneInput.focus();
        return;
    }

    transformationState.name = name;
    transformationState.phone = normalizedPhone;

    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    transformationSetMessage('', false);
    transformationShowStep('loading');

    try {
        const response = await fetch('/analyze-transformation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                phone: normalizedPhone
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = payload.error || 'Could not generate your transformation plan right now.';
            transformationShowStep('identity');
            transformationSetMessage(errorMessage, true);
            return;
        }

        // Handle already-created response
        if (payload.alreadyCreated) {
            transformationShowAlreadyCreatedNotice(name, normalizedPhone);
            return;
        }

        transformationState.plan = payload.plan || null;
        transformationState.generatedAt = payload.generatedAt || new Date().toISOString();
        transformationState.sourceReports = Array.isArray(payload.sourceReports) ? payload.sourceReports : [];
        transformationState.assessmentSnapshot = payload.assessmentSnapshot || null;

        transformationRenderReport();
        transformationShowStep('report');
    } catch (error) {
        transformationShowStep('identity');
        transformationSetMessage('Could not generate your transformation plan right now. Please try again.', true);
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Plan';
    }
}

function transformationRenderReport() {
    const plan = transformationState.plan || {};
    const assessmentSnapshot = transformationState.assessmentSnapshot || {};

    const titleEl = document.getElementById('transformation-report-title');
    const subtitleEl = document.getElementById('transformation-report-subtitle');
    const bodyEl = document.getElementById('transformation-report-body');
    const tableEl = document.getElementById('transformation-action-table');
    const consultationEl = document.getElementById('transformation-consultation');
    const actionsEl = document.getElementById('transformation-report-actions');

    if (titleEl) {
        titleEl.textContent = 'Leadership Transformation Action Plan';
    }

    if (subtitleEl) {
        const dateText = new Date(transformationState.generatedAt || Date.now()).toLocaleDateString();
        subtitleEl.textContent = `${transformationState.name} | Generated on ${dateText}`;
    }

    const totalAnalysed = assessmentSnapshot.totalAssessmentsAnalysed || (transformationState.sourceReports || []).length;

    const styleLine = assessmentSnapshot.style && assessmentSnapshot.style.taken
        ? `${assessmentSnapshot.style.dominantStyle || 'N/A'}${assessmentSnapshot.style.secondaryStyle ? ` | Secondary: ${assessmentSnapshot.style.secondaryStyle}` : ''}${assessmentSnapshot.style.attemptCount > 1 ? ` (${assessmentSnapshot.style.attemptCount} attempts analysed)` : ''}`
        : 'Not available';

    const clarityLine = assessmentSnapshot.clarity && assessmentSnapshot.clarity.taken
        ? `Noise Score: ${assessmentSnapshot.clarity.noiseScore ?? 'N/A'}% | ${assessmentSnapshot.clarity.summary || ''}${assessmentSnapshot.clarity.attemptCount > 1 ? ` (${assessmentSnapshot.clarity.attemptCount} attempts analysed)` : ''}`
        : 'Not available';

    const presenceLine = assessmentSnapshot.presence && assessmentSnapshot.presence.taken
        ? `${assessmentSnapshot.presence.summary || 'Available'}${assessmentSnapshot.presence.attemptCount > 1 ? ` (${assessmentSnapshot.presence.attemptCount} attempts analysed)` : ''}`
        : 'Not available';

    const systemsLine = assessmentSnapshot.systems && assessmentSnapshot.systems.taken
        ? `${assessmentSnapshot.systems.summary || 'Available'}${assessmentSnapshot.systems.attemptCount > 1 ? ` (${assessmentSnapshot.systems.attemptCount} attempts analysed)` : ''}`
        : 'Not available';

    if (bodyEl) {
        bodyEl.innerHTML = `
            <h4>Executive Summary</h4>
            <p>${escapeTransformationHtml(plan.executiveSummary || '')}</p>

            <h4>Consolidated Assessment Snapshot</h4>
            <p><em>Based on ${totalAnalysed} total assessment${totalAnalysed !== 1 ? 's' : ''} on record — full history analysed to identify patterns and evolution.</em></p>
            <ul>
                <li><strong>Leadership Style:</strong> ${escapeTransformationHtml(styleLine)}</li>
                <li><strong>Clarity:</strong> ${escapeTransformationHtml(clarityLine)}</li>
                <li><strong>Presence:</strong> ${escapeTransformationHtml(presenceLine)}</li>
                <li><strong>Systems Thinking:</strong> ${escapeTransformationHtml(systemsLine)}</li>
            </ul>

            <h4>Industry Benchmark Comparison</h4>
            <p>${escapeTransformationHtml(plan.industryComparison || '')}</p>

            <h4>Most Optimal Behaviours</h4>
            <p>${escapeTransformationHtml(plan.optimalBehaviours || '')}</p>

            <h4>Gap Analysis</h4>
            <p>${escapeTransformationHtml(plan.gapAnalysis || '')}</p>

            <h4>How Coaching and Strategic Sessions Help</h4>
            <p>${escapeTransformationHtml(plan.coachingAcceleration || '')}</p>

            <h4>Recommended Learning and Development Mix</h4>
            <ul>
                ${(Array.isArray(plan.learningMix) ? plan.learningMix : []).map((item) => `<li>${escapeTransformationHtml(item)}</li>`).join('')}
            </ul>
        `;
    }

    const actionItems = Array.isArray(plan.actionItems) ? plan.actionItems : [];
    if (tableEl) {
        if (actionItems.length === 0) {
            tableEl.innerHTML = '<p>No action items were returned. Please regenerate your report.</p>';
        } else {
            tableEl.innerHTML = `
                <table class="transformation-plan-table">
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>Key Action</th>
                            <th>Delivery Mode</th>
                            <th>Benefit</th>
                            <th>Start Date</th>
                            <th>Review Date</th>
                            <th>Review Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${actionItems.map((item) => `
                            <tr>
                                <td>${escapeTransformationHtml(item.area)}</td>
                                <td>${escapeTransformationHtml(item.keyAction)}</td>
                                <td>${escapeTransformationHtml(item.deliveryMode)}</td>
                                <td>${escapeTransformationHtml(item.benefit)}</td>
                                <td>${escapeTransformationHtml(item.startDate)}</td>
                                <td>${escapeTransformationHtml(item.reviewDate)}</td>
                                <td>${escapeTransformationHtml(item.reviewType)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }

    if (consultationEl) {
        consultationEl.innerHTML = `<p>${escapeTransformationHtml(plan.coachingAcceleration || 'Send me a message if you would like to discuss the report.')}</p><p>Send me a message if you would like to discuss the report.</p>`;
    }

    if (actionsEl) {
        const whatsappMessage = encodeURIComponent(`Hi Coach, I am ${transformationState.name}. I reviewed my Transformation Plan and would like to discuss it with you.`);
        actionsEl.innerHTML = `
            <button class="btn" type="button" onclick="downloadTransformationReport()">Download Report</button>
            <a class="btn whatsapp-btn" href="https://wa.me/?text=${whatsappMessage}" target="_blank" rel="noopener noreferrer">Send WhatsApp</a>
            <button class="btn btn-secondary" type="button" onclick="closeTransformationPlan()">Close</button>
        `;
    }
}

function transformationShowAlreadyCreatedNotice(name, phone) {
    const reportEl = document.getElementById('transformation-step-report');
    const bodyEl = document.getElementById('transformation-report-body');
    const tableEl = document.getElementById('transformation-action-table');
    const consultationEl = document.getElementById('transformation-consultation');
    const actionsEl = document.getElementById('transformation-report-actions');

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div style="text-align: center; padding: 24px 16px; background: #f0f4f8; border-radius: 10px; margin: 16px 0;">
                <p style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #1d3550;">Your Transformation Plan Has Already Been Created</p>
                <p style="font-size: 14px; margin: 0 0 16px; color: #4d6278;">
                    The number of assessments on file hasn't changed since your plan was generated. Please send a WhatsApp message to Coach Dinesh to retrieve and discuss your current plan.
                </p>
            </div>
        `;
    }

    if (tableEl) tableEl.innerHTML = '';
    if (consultationEl) consultationEl.innerHTML = '';

    if (actionsEl) {
        const whatsappText = encodeURIComponent(
            `Hi Coach, I am ${name} (${phone}). My Transformation Action Plan has been generated. Could you please share the plan with me?`
        );
        actionsEl.innerHTML = `
            <a class="btn whatsapp-btn" href="https://wa.me/919767676738?text=${whatsappText}" target="_blank" rel="noopener noreferrer"
               onclick="sendRetrievalTelegram(${JSON.stringify(name)}, ${JSON.stringify(phone)}, 'transformation')"
               style="text-decoration: none;">Send WhatsApp →</a>
            <button class="btn btn-secondary" type="button" onclick="closeTransformationPlan()">Close</button>
        `;
    }

    transformationShowStep('report');
}

function downloadTransformationReport() {
    const planTitle = document.getElementById('transformation-report-title');
    const planSubtitle = document.getElementById('transformation-report-subtitle');
    const planBody = document.getElementById('transformation-report-body');
    const planTable = document.getElementById('transformation-action-table');
    const signoff = document.querySelector('.transformation-signoff');

    if (!planTitle || !planBody || !planTable) {
        return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
        alert('Please allow popups to download the report.');
        return;
    }

    const printableHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>The Coach Dinesh - Transformation Plan</title>
<style>
body { font-family: Inter, Arial, sans-serif; color: #24313d; margin: 28px; }
.brand-header { border-bottom: 2px solid #dbe8f5; padding-bottom: 10px; margin-bottom: 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.brand-header .text { min-width:0; }
.brand-header h1 { margin: 0; font-size: 30px; color: #1b2f45; font-family: Georgia, serif; }
.brand-header p { margin: 6px 0 0; color: #4d6278; font-size: 13px; }
.brand-header img { width:72px; height:72px; border-radius:50%; border:1px solid #dbe8f5; object-fit:cover; }
h2 { margin: 0; color: #1d3550; font-size: 24px; }
.subtitle { margin: 8px 0 18px; color: #4d6278; }
h4 { margin: 18px 0 8px; color: #264666; }
p, li { line-height: 1.6; }
ul { margin: 8px 0 14px; padding-left: 18px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #dbe8f5; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
th { background: #edf4fb; }
.signoff { margin-top: 20px; }
.signoff img { max-width: 220px; display: block; }
.signoff .name { margin: 6px 0 0; font-weight: 600; }
@media print { body { margin: 10mm; } }
</style>
</head>
<body>
<div class="brand-header">
    <div class="text">
        <h1>The Coach Dinesh</h1>
        <p>Executive Leadership Coaching | contact@thecoachdinesh.com | +91 9767676738</p>
    </div>
    <img src="${window.location.origin}/images/hero-dinesh-small.png" alt="Coach Dinesh" onerror="this.style.display='none'" />
</div>
<h2>${planTitle.innerHTML}</h2>
<p class="subtitle">${planSubtitle ? planSubtitle.innerHTML : ''}</p>
<div>${planBody.innerHTML}</div>
<div>
  <h4>Action Plan Table</h4>
  ${planTable.innerHTML}
</div>
<div class="signoff">${signoff ? signoff.innerHTML : ''}</div>
</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

function initTransformationPlan() {
    const launchButton = document.getElementById('transformation-launch-btn');
    if (launchButton) {
        launchButton.style.display = '';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransformationPlan);
} else {
    initTransformationPlan();
}
