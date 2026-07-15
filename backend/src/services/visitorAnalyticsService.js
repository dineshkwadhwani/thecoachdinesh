const { supabase } = require('./supabaseClient');

/**
 * Track a visitor's first visit to the site
 * Uses session ID to ensure only one entry per visit
 */
async function trackVisitor(req, res, next) {
    try {
        // Get or create session ID
        let sessionId = req.cookies.visitor_session;

        if (!sessionId) {
            // First time visitor - create session and log
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const ip = getClientIp(req);
            const url = req.originalUrl || req.url;
            const userAgent = req.get('user-agent') || '';

            // Log to Supabase
            try {
                const { error } = await supabase
                    .from('visitor_logs')
                    .insert({
                        ip_address: ip,
                        url: url,
                        session_id: sessionId,
                        user_agent: userAgent
                    });

                if (error && error.code !== '23505') { // Ignore unique constraint errors
                    console.error('Error logging visitor:', error.message);
                }
            } catch (dbError) {
                console.error('Error tracking visitor:', dbError.message);
            }

            // Set session cookie (expires in 24 hours)
            res.cookie('visitor_session', sessionId, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
        }

        // Continue to next middleware/route
        next();
    } catch (error) {
        console.error('Visitor tracking error:', error.message);
        // Don't block request on tracking error
        next();
    }
}

/**
 * Get client IP address from request
 */
function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Get visitor logs with pagination
 */
async function getVisitorLogs(page = 1, pageSize = 50) {
    try {
        const offset = (page - 1) * pageSize;

        // Get total count
        const { count, error: countError } = await supabase
            .from('visitor_logs')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Get paginated data
        const { data, error } = await supabase
            .from('visitor_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
            data: data || [],
            total: count || 0,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    } catch (error) {
        console.error('Error fetching visitor logs:', error.message);
        return {
            data: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
            error: error.message
        };
    }
}

module.exports = {
    trackVisitor,
    getVisitorLogs,
    getClientIp
};
