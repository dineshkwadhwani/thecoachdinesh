const path = require('path');
const fs = require('fs');

// Use Supabase if credentials are available, otherwise fall back to file-based storage
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
let supabaseService = null;

if (useSupabase) {
    try {
        supabaseService = require('./supabaseReportService');
        console.log('✓ Using Supabase for report storage');
    } catch (error) {
        console.warn('Failed to load Supabase service, falling back to file storage:', error.message);
        supabaseService = null;
    }
}

const REPORT_HISTORY_PATH = path.join(__dirname, '../../report-history.json');
const TRANSFORMATION_SUMMARY_PATH = path.join(__dirname, '../../transformation-summary.json');

// FILE-BASED FALLBACK FUNCTIONS
function loadReportHistoryFile() {
    try {
        if (fs.existsSync(REPORT_HISTORY_PATH)) {
            const rawData = fs.readFileSync(REPORT_HISTORY_PATH, 'utf8');
            const parsed = JSON.parse(rawData);
            if (!parsed.leads) {
                parsed.leads = {};
            }
            return parsed;
        }
    } catch (error) {
        console.error('Error loading report history from file:', error.message);
    }
    return { leads: {} };
}

function saveReportHistoryFile(history) {
    try {
        fs.writeFileSync(REPORT_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving report history to file:', error.message);
        throw error;
    }
}

function loadTransformationSummaryFile() {
    try {
        if (fs.existsSync(TRANSFORMATION_SUMMARY_PATH)) {
            const rawData = fs.readFileSync(TRANSFORMATION_SUMMARY_PATH, 'utf8');
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error('Error loading transformation summary from file:', error.message);
    }
    return {};
}

function saveTransformationSummaryFile(summary) {
    try {
        fs.writeFileSync(TRANSFORMATION_SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving transformation summary to file:', error.message);
        throw error;
    }
}

// PUBLIC API (delegates to Supabase or file storage)
async function loadReportHistory() {
    if (supabaseService) {
        return supabaseService.loadReportHistory();
    }
    return loadReportHistoryFile();
}

async function saveReportHistory(history) {
    if (supabaseService) {
        return supabaseService.saveReportHistory(history);
    }
    return saveReportHistoryFile(history);
}

async function loadTransformationSummary() {
    if (supabaseService) {
        return supabaseService.loadTransformationSummary();
    }
    return loadTransformationSummaryFile();
}

async function saveTransformationSummary(summary) {
    if (supabaseService) {
        return supabaseService.saveTransformationSummary(summary);
    }
    return saveTransformationSummaryFile(summary);
}

function createLeadKey(email, mobile) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedMobile = String(mobile || '').replace(/\s+/g, '');
    return `${normalizedEmail}::${normalizedMobile}`;
}

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

function getLatestStoredReport(history, email, mobile, quizType) {
    const leadKey = createLeadKey(email, mobile);
    const userRecord = history.leads ? history.leads[leadKey] : null;
    if (!userRecord || !userRecord.reports) return null;

    const matchingReports = userRecord.reports.filter(r => r.quizType === quizType);
    return matchingReports.length > 0 ? matchingReports[matchingReports.length - 1] : null;
}

async function getTransformationAssessmentCount(phone) {
    if (supabaseService) {
        return supabaseService.getTransformationAssessmentCount(phone);
    }
    const summary = loadTransformationSummaryFile();
    const entry = summary[String(phone || '').trim()];
    return entry && typeof entry.assessmentCount === 'number' ? entry.assessmentCount : null;
}

async function setTransformationAssessmentCount(phone, count) {
    if (supabaseService) {
        return supabaseService.setTransformationAssessmentCount(phone, count);
    }
    const summary = loadTransformationSummaryFile();
    summary[String(phone || '').trim()] = {
        assessmentCount: count,
        updatedAt: new Date().toISOString()
    };
    saveTransformationSummaryFile(summary);
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
