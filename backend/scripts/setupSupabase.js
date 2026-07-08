#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { supabase } = require('../src/services/supabaseClient');

const SQL_MIGRATIONS = `
-- Create report_history table
CREATE TABLE IF NOT EXISTS report_history (
    id BIGSERIAL PRIMARY KEY,
    lead_key TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    mobile TEXT,
    reports JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_history_lead_key ON report_history(lead_key);
CREATE INDEX IF NOT EXISTS idx_report_history_email ON report_history(email);
CREATE INDEX IF NOT EXISTS idx_report_history_mobile ON report_history(mobile);

-- Create transformation_summary table
CREATE TABLE IF NOT EXISTS transformation_summary (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    assessment_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transformation_summary_phone ON transformation_summary(phone);
`;

async function setupSupabase() {
    console.log('🔗 Testing Supabase connection...');

    try {
        // Test connection by doing a simple query
        const { data, error: testError } = await supabase
            .from('report_history')
            .select('id')
            .limit(1);

        if (testError && testError.code === '42P01') {
            console.log('⚠️  Tables do not exist yet.');
            console.log('\n📋 Please run the following SQL in your Supabase dashboard:');
            console.log('   1. Go to https://app.supabase.com/project/nzhnyyysrxnxehnichbr/sql/new');
            console.log('   2. Paste the SQL below and execute:\n');
            console.log('---START SQL---');
            console.log(SQL_MIGRATIONS);
            console.log('---END SQL---\n');
            console.log('After creating the tables, run this script again.');
            process.exit(1);
        } else if (testError) {
            throw testError;
        }

        console.log('✓ Successfully connected to Supabase');
        console.log('✓ Tables appear to exist');

        // Verify transformation_summary table
        const { error: transformError } = await supabase
            .from('transformation_summary')
            .select('id')
            .limit(1);

        if (transformError && transformError.code === '42P01') {
            throw new Error('transformation_summary table is missing');
        }

        console.log('✓ Both tables verified');

        // Run a test insert
        console.log('\n🧪 Running connection test...');
        const testLeadKey = 'test@test.com::9999999999';

        const { error: insertError } = await supabase
            .from('report_history')
            .upsert({
                lead_key: testLeadKey,
                name: 'Test User',
                email: 'test@test.com',
                mobile: '9999999999',
                reports: []
            }, { onConflict: 'lead_key' });

        if (insertError) throw insertError;

        const { data: testData, error: selectError } = await supabase
            .from('report_history')
            .select('*')
            .eq('lead_key', testLeadKey);

        if (selectError) throw selectError;

        if (testData && testData.length > 0) {
            console.log('✓ Test insert/select successful');
        }

        console.log('\n✅ Supabase connection verified!');
        console.log('   URL: ' + process.env.SUPABASE_URL);
        console.log('   Tables: report_history, transformation_summary');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupSupabase();
