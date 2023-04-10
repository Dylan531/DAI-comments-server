
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min in milliseconds
  max: 25,
  message: "Request error, you have reached maximum number of requests for this period. Please try again after 30 minutes", 
  statusCode: 429,
  headers: true,
});

module.exports = { rateLimiter }