// File: middleware/rateLimit.js - Rate limiting middleware

const rateLimit = require("express-rate-limit");

// Create rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 auth requests per hour
  message: "Too many authentication attempts, please try again after an hour",
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 upload requests per hour
  message: "Too many upload attempts, please try again after an hour",
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};
