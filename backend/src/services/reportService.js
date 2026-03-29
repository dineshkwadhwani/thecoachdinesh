const path = require('path');
const fs = require('fs');

const REPORT_HISTORY_PATH = path.join(__dirname, '../../report-history.json');
const TRANSFORMATION_SUMMARY_PATH = path.join(__dirname, '../../transformation-summary.json');

/**
 * Load report history from file
 */
function loadReportHistory() {
    try {
        if (fs.existsSync(REPORT_HISTORY_PATH)) {
            const rawData = fs.readFileSync(REPORT_HISTORY_PATH, 'utf8');
            const parsed = JSON.parse(rawData);
            // Ensure leads structure exists
            if (!parsed.leads) {
                parsed.leads = {};
            }
            return parsed;
        }
    } catch (error) {
        console.error('Error loading report history:', error.message);
    }
    return { leads: {} };
}

/**
 * Save report history to file
 */
function saveReportHistory(history) {
    try {
        fs.writeFileSync(REPORT_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving report history:', error.message);
        throw error;
    }
}

/**
 * Load transformation summary from file
 */
function loadTransformationSummary() {
    try {
        if (fs.existsSync(TRANSFORMATION_SUMMARY_PATH)) {
            const rawData = fs.readFileSync(TRANSFORMATION_SUMMARY_PATH, 'utf8');
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error('Error loading transformation summary:', error.message);
    }
    return {};
}

/**
 * Save transformation summary to file
 */
function saveTransformationSummary(summary) {
    try {
        fs.writeFileSync(TRANSFORMATION_SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving transformation summary:', error.message);
        throw error;
    }
}

/**
 * Create lead key from email and mobile
 */
function createLeadKey(email, mobile) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedMobile = String(mobile || '').replace(/\s+/g, '');
    return `${normalizedEmail}::${normalizedMobile}`;
}

/**
 * Append a report to the history
 */
function appendStoredReport(history, reportData) {
    const leadKey = createLeadKey(reportData.email, reportData.mobile);
    const existingLead = history.leads[leadKey] || {
        name: reportData.name,
        email: reportData.email,
        mobile: reportData.mobile,
        reports: []
    };

    existingLead.name = reportData.name;
    existingLead.email = reportData.email;
    existingLead.mobile = reportData.mobile;
    existingLead.reports.push(reportData);

    history.leads[leadKey] = existingLead;
}

/**
 * Get the latest stored report of a specific type
 */
function getLatestStoredReport(history, email, mobile, quizType) {
    const leadKey = createLeadKey(email, mobile);
    const userRecord = history.leads ? history.leads[leadKey] : null;
    if (!userRecord || !userRecord.reports) return null;

    const matchingReports = userRecord.reports.filter(r => r.quizType === quizType);
    return matchingReports.length > 0 ? matchingReports[matchingReports.length - 1] : null;
}

/**
 * Get transformation assessment count from summary for a phone number
 */
function getTransformationAssessmentCount(phone) {
    const summary = loadTransformationSummary();
    const entry = summary[String(phone || '').trim()];
    return entry && typeof entry.assessmentCount === 'number' ? entry.assessmentCount : null;
}

/**
 * Set transformation assessment count in summary
 */
function setTransformationAssessmentCount(phone, count) {
    const summary = loadTransformationSummary();
    summary[String(phone || '').trim()] = {
        assessmentCount: count,
        updatedAt: new Date().toISOString()
    };
    saveTransformationSummary(summary);
}

module.exports = {
    loadReportHistory,
    saveReportHistory,
    loadTransformationSummary,
    saveTransformationSummary,
    createLeadKey,
    appendStoredReport,
    getLatestStoredReport,
    getTransformationAssessmentCount,
    setTransformationAssessmentCount
};
