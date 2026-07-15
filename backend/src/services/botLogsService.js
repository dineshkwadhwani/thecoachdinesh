const { supabase } = require('./supabaseClient');

/**
 * Log bot conversation to database
 */
async function logBotConversation(name, phone, interaction) {
    try {
        if (!name || !phone) {
            console.warn('[BOT_LOG] Skipping: missing name or phone');
            return { success: false, error: 'Missing name or phone' };
        }

        const { error } = await supabase
            .from('bot_logs')
            .insert({
                name,
                phone,
                interaction
            });

        if (error) {
            console.error('[BOT_LOG] Insert error:', error.message);
            return { success: false, error: error.message };
        }

        console.log('[BOT_LOG] Logged conversation for', name, '(' + phone + ')');
        return { success: true };
    } catch (error) {
        console.error('[BOT_LOG] Exception:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get bot logs with pagination
 */
async function getBotLogs(page = 1, pageSize = 20, filter = '24h') {
    try {
        const offset = (page - 1) * pageSize;

        // Calculate cutoff time based on filter
        let cutoffTime = null;
        if (filter === '24h') {
            cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (filter === '7d') {
            cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (filter === '30d') {
            cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get total count (all time)
        const { count: totalCount, error: totalCountError } = await supabase
            .from('bot_logs')
            .select('*', { count: 'exact', head: true });

        if (totalCountError) throw totalCountError;

        // Get count for last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { count: last24Count, error: last24Error } = await supabase
            .from('bot_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', oneDayAgo.toISOString());

        if (last24Error) throw last24Error;

        // Get filtered and paginated data
        let query = supabase.from('bot_logs').select('*');

        if (cutoffTime) {
            query = query.gte('timestamp', cutoffTime.toISOString());
        }

        const { data, error, count } = await query
            .order('timestamp', { ascending: false })
            .range(offset, offset + pageSize - 1)
            .select('*', { count: 'exact' });

        if (error) throw error;

        return {
            data: data || [],
            total: totalCount || 0,
            last24Hours: last24Count || 0,
            filteredCount: count || 0,
            page,
            pageSize,
            filter,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    } catch (error) {
        console.error('Error fetching bot logs:', error.message);
        return {
            data: [],
            total: 0,
            last24Hours: 0,
            filteredCount: 0,
            page,
            pageSize,
            filter,
            totalPages: 0,
            error: error.message
        };
    }
}

/**
 * Delete all bot logs
 */
async function deleteAllBotLogs() {
    try {
        const { error } = await supabase
            .from('bot_logs')
            .delete()
            .neq('id', -1);

        if (error) throw error;

        console.log('[BOT_LOG] All logs deleted');
        return { success: true };
    } catch (error) {
        console.error('[BOT_LOG] Delete error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    logBotConversation,
    getBotLogs,
    deleteAllBotLogs
};
