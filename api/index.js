const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({
  path: path.join(__dirname, '../backend/.env')
});

// Import the Express app
const app = require('../backend/app.js');

// Export the app for Vercel to use as a serverless function
module.exports = app;
