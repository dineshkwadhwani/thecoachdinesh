document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', function() {
        navLinks.classList.remove('active');
      });
    });
  }
});

// ---- Shared duplicate-check helper used by all quiz identity steps ----

// Returns true if a report already exists for this phone+quizType.
// Shows an already-taken notice in the given container element if so.
// continueBtn is the Continue/Next button to hide while checking.
async function checkExistingReportAndShowNotice(phone, quizType, name, containerEl, continueBtn) {
    let response;
    try {
        response = await fetch(`/check-existing-report?phone=${encodeURIComponent(phone)}&quizType=${encodeURIComponent(quizType)}`);
    } catch (fetchError) {
        // Network error — allow them through rather than blocking
        return false;
    }

    if (!response.ok) {
        return false;
    }

    const data = await response.json();
    if (!data.exists) {
        return false;
    }

    // Show already-taken notice inside the identity step container
    const quizLabel = {
        quick: 'Leadership Style',
        deep: 'Leadership Style (Deep)',
        clarity: 'Strategic Clarity',
        presence: 'Executive Presence',
        systems: 'Systems Thinking'
    }[quizType] || quizType;

    const whatsappText = encodeURIComponent(
        `Hi Coach, I am ${name} (${phone}). I have already completed the ${quizLabel} assessment. Could you please share my report with me?`
    );

    const noticeId = `already-taken-notice-${quizType}`;
    let noticeEl = document.getElementById(noticeId);
    if (!noticeEl) {
        noticeEl = document.createElement('div');
        noticeEl.id = noticeId;
        noticeEl.style.cssText = 'margin-top:16px;padding:16px;background:#edf4fb;border:1px solid #bdd5ed;border-radius:10px;text-align:center;';
        containerEl.appendChild(noticeEl);
    }

    noticeEl.innerHTML = `
        <p style="margin:0 0 10px;font-weight:600;color:#1d3550;">You have already taken this assessment.</p>
        <p style="margin:0 0 14px;color:#4d6278;font-size:14px;">Please send a WhatsApp message to Coach Dinesh to retrieve your report.</p>
        <a class="btn" href="https://wa.me/919767676738?text=${whatsappText}" target="_blank" rel="noopener noreferrer"
           onclick="sendRetrievalTelegram(${JSON.stringify(name)}, ${JSON.stringify(phone)}, ${JSON.stringify(quizType)})"
           style="display:inline-block;text-decoration:none;">Send WhatsApp →</a>
    `;
    noticeEl.style.display = 'block';

    if (continueBtn) {
        continueBtn.style.display = 'none';
    }

    return true;
}

async function sendRetrievalTelegram(name, phone, quizType) {
    try {
        await fetch('/request-report-retrieval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, quizType })
        });
    } catch (e) {
        // non-blocking
    }
}
