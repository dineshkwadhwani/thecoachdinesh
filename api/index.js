// Handler for Vercel serverless function
// Import the Express app from backend
const app = require('../backend/app.js');

// Vercel will invoke this handler for all requests
module.exports = app;
