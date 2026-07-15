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
        const referer = req.get?.('referer') || req.headers?.['referer'] || null;
        const acceptLanguage = req.get?.('accept-language') || req.headers?.['accept-language'] || null;

        // Skip logging for favicon, assets, etc.
        if (url.includes('.ico') || url.includes('.png') || url.includes('.css') || url.includes('.js')) {
            return;
        }

        // Only log if we have valid data
        if (!ip) {
            console.warn('Skipping visitor log: missing ip');
            return;
        }

        // Parse User-Agent to get browser, OS, and device type
        const ua_parsed = parseUserAgent(userAgent);

        // Fetch location data (async, don't wait for it)
        const location = await fetchLocationData(ip);

        const { error } = await supabase
            .from('visitor_logs')
            .insert({
                ip_address: ip,
                url: url,
                session_id: sessionKey,
                user_agent: userAgent,
                browser_name: ua_parsed.browser_name,
                browser_version: ua_parsed.browser_version,
                os_name: ua_parsed.os_name,
                os_version: ua_parsed.os_version,
                device_type: ua_parsed.device_type,
                referer: referer,
                accept_language: acceptLanguage,
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
            const device_str = `[${ua_parsed.device_type}] ${ua_parsed.browser_name} / ${ua_parsed.os_name}`;
            const location_str = location ? `${location.city || location.country || 'Unknown'}` : 'Unknown';
            console.log('[VISITOR_LOG] Logged:', ip, location_str, device_str, url.substring(0, 40));
        }
    } catch (error) {
        console.error('[VISITOR_LOG] Exception:', error.message);
    }
}

/**
 * Fetch geolocation data for an IP address using ipinfo.io (works better with Vercel)
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

        // Use ipinfo.io instead of ip-api.com (more reliable with Vercel)
        const url = `https://ipinfo.io/${ip}/json`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Coach-Analytics/1.0' }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('[GEOLOCATION_ERROR] HTTP', response.status, 'for IP', ip, '- using ipinfo.io');
                return null;
            }

            const data = await response.json();

            // ipinfo.io returns data directly (no status field)
            if (data.city && data.country) {
                const [lat, lon] = (data.loc || ',').split(',').map(s => s.trim());
                const location = {
                    country: data.country || null,
                    city: data.city || null,
                    latitude: lat ? parseFloat(lat) : null,
                    longitude: lon ? parseFloat(lon) : null,
                    isp: data.org || null,
                    timestamp: Date.now()
                };
                locationCache.set(ip, { data: location, timestamp: Date.now() });
                console.log('[GEOLOCATION_SUCCESS]', ip, data.city, data.country);
                return location;
            } else {
                console.error('[GEOLOCATION_ERROR] Incomplete data for IP', ip, 'city:', data.city, 'country:', data.country);
                return null;
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('[GEOLOCATION_ERROR] Timeout (8s) for IP', ip);
            } else {
                console.error('[GEOLOCATION_ERROR] Fetch exception for IP', ip, ':', fetchError.message);
            }
            return null;
        }
    } catch (error) {
        console.error('[GEOLOCATION_ERROR] Outer exception for IP', ip, ':', error.message);
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
 * Parse User-Agent to extract browser, OS, and device type
 */
function parseUserAgent(ua) {
    const result = {
        browser_name: 'Unknown',
        browser_version: '',
        os_name: 'Unknown',
        os_version: '',
        device_type: 'Desktop' // Default to Desktop
    };

    if (!ua) return result;

    // Detect Device Type (Mobile/Tablet/Desktop)
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

    if (isTablet) result.device_type = 'Tablet';
    else if (isMobile) result.device_type = 'Mobile';
    else result.device_type = 'Desktop';

    // Detect OS
    if (/Windows NT 10.0/.test(ua)) {
        result.os_name = 'Windows';
        result.os_version = '10';
    } else if (/Windows NT 11.0/.test(ua)) {
        result.os_name = 'Windows';
        result.os_version = '11';
    } else if (/Mac OS X/.test(ua)) {
        result.os_name = 'macOS';
        const match = ua.match(/Mac OS X ([\d_]+)/);
        if (match) result.os_version = match[1].replace(/_/g, '.');
    } else if (/Android/.test(ua)) {
        result.os_name = 'Android';
        const match = ua.match(/Android ([\d.]+)/);
        if (match) result.os_version = match[1];
    } else if (/iPhone|iPad|iPod/.test(ua)) {
        result.os_name = 'iOS';
        const match = ua.match(/OS ([\d_]+)/);
        if (match) result.os_version = match[1].replace(/_/g, '.');
    } else if (/Linux/.test(ua)) {
        result.os_name = 'Linux';
    }

    // Detect Browser
    if (/Chrome|Chromium|CriOS/.test(ua) && !/Edge|Edg|OPR/.test(ua)) {
        result.browser_name = 'Chrome';
        const match = ua.match(/Chrome[/\s]([\d.]+)/) || ua.match(/CriOS[/\s]([\d.]+)/);
        if (match) result.browser_version = match[1].split('.')[0];
    } else if (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edge|Edg|OPR/.test(ua)) {
        result.browser_name = 'Safari';
        const match = ua.match(/Version[/\s]([\d.]+)/);
        if (match) result.browser_version = match[1].split('.')[0];
    } else if (/Firefox|FxiOS/.test(ua)) {
        result.browser_name = 'Firefox';
        const match = ua.match(/Firefox[/\s]([\d.]+)/) || ua.match(/FxiOS[/\s]([\d.]+)/);
        if (match) result.browser_version = match[1].split('.')[0];
    } else if (/Edg|Edge/.test(ua)) {
        result.browser_name = 'Edge';
        const match = ua.match(/Edg[e/\s]([\d.]+)/);
        if (match) result.browser_version = match[1].split('.')[0];
    } else if (/OPR|Opera/.test(ua)) {
        result.browser_name = 'Opera';
        const match = ua.match(/OPR[/\s]([\d.]+)/) || ua.match(/Opera[/\s]([\d.]+)/);
        if (match) result.browser_version = match[1].split('.')[0];
    }

    return result;
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
