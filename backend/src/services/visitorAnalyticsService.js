const { supabase } = require('./supabaseClient');

// Track sessions in memory (IP + User Agent = session)
// This prevents logging the same visitor multiple times in a 30-minute window
const activeSessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Cache for IP location lookups (avoid repeated API calls)
const locationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Track a visitor's first visit to the site
 * Uses IP + User Agent to identify unique sessions
 * Only logs once per 30-minute window per unique IP
 */
function trackVisitor(req, res, next) {
    try {
        const ip = getClientIp(req);
        const userAgent = req.get?.('user-agent') || req.headers?.['user-agent'] || '';
        const sessionKey = `${ip}::${userAgent}`.substring(0, 200); // Limit key length

        const now = Date.now();
        const lastVisitTime = activeSessions.get(sessionKey);

        // If this IP+UA hasn't visited in the last 30 minutes, log it
        if (!lastVisitTime || (now - lastVisitTime) > SESSION_TIMEOUT) {
            activeSessions.set(sessionKey, now);

            // Log visitor asynchronously (don't wait for it)
            logVisitorAsync(req, sessionKey).catch(err => {
                console.error('Visitor logging error:', err.message);
            });
        }

        // Continue to next middleware/route immediately
        next();
    } catch (error) {
        console.error('Visitor tracking middleware error:', error.message);
        next();
    }
}

/**
 * Async function to log visitor (runs in background)
 */
async function logVisitorAsync(req, sessionKey) {
    try {
        const ip = getClientIp(req);
        const url = req.originalUrl || req.url || '/';
        const userAgent = req.get?.('user-agent') || req.headers?.['user-agent'] || '';

        // Skip logging for favicon, assets, etc.
        if (url.includes('.ico') || url.includes('.png') || url.includes('.css') || url.includes('.js')) {
            return;
        }

        // Only log if we have valid data
        if (!ip) {
            console.warn('Skipping visitor log: missing ip');
            return;
        }

        // Fetch location data (async, don't wait for it)
        const location = await fetchLocationData(ip);

        const { error } = await supabase
            .from('visitor_logs')
            .insert({
                ip_address: ip,
                url: url,
                session_id: sessionKey,
                user_agent: userAgent,
                country: location?.country || null,
                city: location?.city || null,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
                isp: location?.isp || null
            });

        if (error) {
            // 23505 is unique constraint error (session already exists) - ignore it
            if (error.code !== '23505') {
                console.error('[VISITOR_LOG] Insert error:', error.code, error.message);
            }
        } else {
            const location_str = location ? `${location.city || location.country || 'Unknown'}` : 'Unknown';
            console.log('[VISITOR_LOG] Logged:', ip, location_str, url.substring(0, 50));
        }
    } catch (error) {
        console.error('[VISITOR_LOG] Exception:', error.message);
    }
}

/**
 * Fetch geolocation data for an IP address using ip-api.com
 */
async function fetchLocationData(ip) {
    try {
        // Check cache first
        const cached = locationCache.get(ip);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return cached.data;
        }

        // Skip lookup for localhost/private IPs
        if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return null;
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,lat,lon,isp`, {
            timeout: 5000
        });

        if (!response.ok) throw new Error('IP lookup failed');

        const data = await response.json();

        if (data.status === 'success') {
            const location = {
                country: data.country || null,
                city: data.city || null,
                latitude: data.lat || null,
                longitude: data.lon || null,
                isp: data.isp || null,
                timestamp: Date.now()
            };

            // Cache the result
            locationCache.set(ip, { data: location, timestamp: Date.now() });
            return location;
        }

        return null;
    } catch (error) {
        console.error('[GEOLOCATION] Error fetching location for', ip, ':', error.message);
        return null;
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
