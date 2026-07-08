const { supabase } = require('./supabaseClient');

/**
 * Create lead key from email and mobile
 */
function createLeadKey(email, mobile) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedMobile = String(mobile || '').replace(/\s+/g, '');
    return `${normalizedEmail}::${normalizedMobile}`;
}

/**
 * Load report history from Supabase
 */
async function loadReportHistory() {
    try {
        const { data, error } = await supabase
            .from('report_history')
            .select('*');

        if (error) throw error;

        // Convert to the expected format: { leads: { leadKey: { name, email, mobile, reports } } }
        const leads = {};
        if (data) {
            data.forEach(row => {
                leads[row.lead_key] = {
                    name: row.name,
                    email: row.email,
                    mobile: row.mobile,
                    reports: Array.isArray(row.reports) ? row.reports : []
                };
            });
        }
        return { leads };
    } catch (error) {
        console.error('Error loading report history from Supabase:', error.message);
        return { leads: {} };
    }
}

/**
 * Save report history to Supabase (upsert)
 */
async function saveReportHistory(history) {
    try {
        const records = [];
        for (const [leadKey, leadData] of Object.entries(history.leads || {})) {
            records.push({
                lead_key: leadKey,
                name: leadData.name,
                email: leadData.email,
                mobile: leadData.mobile,
                reports: leadData.reports || []
            });
        }

        if (records.length === 0) return;

        const { error } = await supabase
            .from('report_history')
            .upsert(records, { onConflict: 'lead_key' });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving report history to Supabase:', error.message);
        throw error;
    }
}

/**
 * Load transformation summary from Supabase
 */
async function loadTransformationSummary() {
    try {
        const { data, error } = await supabase
            .from('transformation_summary')
            .select('*');

        if (error) throw error;

        const summary = {};
        if (data) {
            data.forEach(row => {
                summary[row.phone] = {
                    assessmentCount: row.assessment_count,
                    updatedAt: row.updated_at
                };
            });
        }
        return summary;
    } catch (error) {
        console.error('Error loading transformation summary from Supabase:', error.message);
        return {};
    }
}

/**
 * Save transformation summary to Supabase
 */
async function saveTransformationSummary(summary) {
    try {
        const records = [];
        for (const [phone, data] of Object.entries(summary)) {
            records.push({
                phone: phone,
                assessment_count: data.assessmentCount || 0,
                updated_at: data.updatedAt || new Date().toISOString()
            });
        }

        if (records.length === 0) return;

        const { error } = await supabase
            .from('transformation_summary')
            .upsert(records, { onConflict: 'phone' });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving transformation summary to Supabase:', error.message);
        throw error;
    }
}

/**
 * Append a report to the history
 */
async function appendStoredReport(history, reportData) {
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
    existingLead.reports = Array.isArray(existingLead.reports) ? existingLead.reports : [];
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
 * Get transformation assessment count from Supabase
 */
async function getTransformationAssessmentCount(phone) {
    try {
        const { data, error } = await supabase
            .from('transformation_summary')
            .select('assessment_count')
            .eq('phone', String(phone || '').trim())
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
        return data && typeof data.assessment_count === 'number' ? data.assessment_count : null;
    } catch (error) {
        console.error('Error getting transformation assessment count:', error.message);
        return null;
    }
}

/**
 * Set transformation assessment count in Supabase
 */
async function setTransformationAssessmentCount(phone, count) {
    try {
        const { error } = await supabase
            .from('transformation_summary')
            .upsert({
                phone: String(phone || '').trim(),
                assessment_count: count,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' });

        if (error) throw error;
    } catch (error) {
        console.error('Error setting transformation assessment count:', error.message);
        throw error;
    }
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
