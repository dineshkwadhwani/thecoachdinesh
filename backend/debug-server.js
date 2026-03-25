#!/usr/bin/env node

const path = require('path');

// Load env variables FIRST
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('✓ Dotenv loaded');
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('TELEGRAM_TOKEN exists:', !!process.env.TELEGRAM_TOKEN);
console.log('PORT:', process.env.PORT || 3000);

try {
    console.log('\n✓ Loading coachService...');
    const { askDinesh } = require('./coachService');
    console.log('✓ coachService loaded successfully');
    
    console.log('\n✓ Starting Express...');
    const express = require('express');
    const cors = require('cors');
    const fs = require('fs');
    const OpenAI = require('openai');
    
    const app = express();
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.use(cors());
    app.use(express.json());
    
    app.get('/ping', (req, res) => {
        res.status(200).send('Coach is awake!');
    });
    
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`\n✓ Coach is online at http://localhost:${PORT}`);
        console.log('Server is running. Press Ctrl+C to stop.\n');
    });
    
} catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
}
