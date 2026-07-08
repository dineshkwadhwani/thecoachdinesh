const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Import the Express app from backend
module.exports = require('../backend/app.js');
