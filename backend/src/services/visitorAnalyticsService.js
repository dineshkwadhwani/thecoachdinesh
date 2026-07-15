const { supabase } = require('./supabaseClient');

/**
 * Track a visitor's first visit to the site
 * Uses session ID to ensure only one entry per visit
 */
function trackVisitor(req, res, next) {
    try {
        // Get or create session ID from cookies
        const sessionId = req.cookies?.visitor_session;

        // If no session, this is a first-time visitor
        if (!sessionId) {
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Set session cookie immediately (expires in 24 hours)
            res.cookie('visitor_session', newSessionId, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });

            // Log visitor asynchronously (don't wait for it)
            logVisitorAsync(req, newSessionId).catch(err => {
                console.error('Visitor logging error:', err.message);
            });
        }

        // Continue to next middleware/route immediately
        next();
    } catch (error) {
        console.error('Visitor tracking middleware error:', error.message);
        // Always continue to next route, don't block on tracking error
        next();
    }
}

/**
 * Async function to log visitor (runs in background)
 */
async function logVisitorAsync(req, sessionId) {
    try {
        const ip = getClientIp(req);
        const url = req.originalUrl || req.url || '/';
        const userAgent = req.get?.('user-agent') || req.headers?.['user-agent'] || '';

        // Only log if we have valid data
        if (!ip || !url) {
            console.warn('Skipping visitor log: missing ip or url');
            return;
        }

        const { error } = await supabase
            .from('visitor_logs')
            .insert({
                ip_address: ip,
                url: url,
                session_id: sessionId,
                user_agent: userAgent
            });

        if (error) {
            // 23505 is unique constraint error (session already exists) - ignore it
            if (error.code !== '23505') {
                console.error('[VISITOR_LOG] Insert error:', error.code, error.message);
            }
        } else {
            console.log('[VISITOR_LOG] Logged:', ip, url);
        }
    } catch (error) {
        console.error('[VISITOR_LOG] Exception:', error.message);
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
