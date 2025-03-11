// File: utils/sendEmail.js - Email utility

const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Create reusable transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log("Message sent: %s", info.messageId);
};

module.exports = sendEmail;

// File: utils/errorResponse.js - Custom error class

class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;

// File: utils/validators.js - Data validation utilities

const validateEmail = (email) => {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
  // Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return re.test(password);
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

module.exports = {
  validateEmail,
  validatePassword,
  sanitizeInput,
};

// File: utils/pagination.js - Pagination utility

const paginateResults = async (
  model,
  query,
  page = 1,
  limit = 10,
  populate = null,
  sort = { createdAt: -1 }
) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments(query);

  // Build pagination object
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  pagination.total = total;
  pagination.pages = Math.ceil(total / limit);
  pagination.currentPage = page;

  // Execute query
  let results;
  if (populate) {
    results = await model
      .find(query)
      .skip(startIndex)
      .limit(limit)
      .sort(sort)
      .populate(populate);
  } else {
    results = await model.find(query).skip(startIndex).limit(limit).sort(sort);
  }

  return {
    pagination,
    data: results,
  };
};

module.exports = paginateResults;

// File: utils/analytics.js - Analytics utility

const Resource = require("../models/Resource");
const User = require("../models/User");
const Forum = require("../models/Forum");
const Post = require("../models/Post");

const getResourceStats = async (period = "week") => {
  let dateFilter = {};
  const now = new Date();

  if (period === "day") {
    dateFilter = {
      createdAt: {
        $gte: new Date(now.setDate(now.getDate() - 1)),
      },
    };
  } else if (period === "week") {
    dateFilter = {
      createdAt: {
        $gte: new Date(now.setDate(now.getDate() - 7)),
      },
    };
  } else if (period === "month") {
    dateFilter = {
      createdAt: {
        $gte: new Date(now.setMonth(now.getMonth() - 1)),
      },
    };
  }

  // Get total resources
  const totalResources = await Resource.countDocuments();
  const newResources = await Resource.countDocuments(dateFilter);

  // Get resource downloads
  const downloads = await Resource.aggregate([
    { $group: { _id: null, total: { $sum: "$downloads" } } },
  ]);

  // Get resource views
  const views = await Resource.aggregate([
    { $group: { _id: null, total: { $sum: "$views" } } },
  ]);

  // Get resources by type
  const resourceTypes = await Resource.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  // Get resources by faculty
  const resourcesByFaculty = await Resource.aggregate([
    { $group: { _id: "$faculty", count: { $sum: 1 } } },
  ]);

  return {
    totalResources,
    newResources,
    downloads: downloads.length ? downloads[0].total : 0,
    views: views.length ? views[0].total : 0,
    resourceTypes,
    resourcesByFaculty,
  };
};

const getUserStats = async () => {
  // Get total users
  const totalUsers = await User.countDocuments();

  // Get users by role
  const usersByRole = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  // Get users by faculty
  const usersByFaculty = await User.aggregate([
    { $group: { _id: "$faculty", count: { $sum: 1 } } },
  ]);

  // Get top contributors
  const topContributors = await User.find()
    .sort({ contributionPoints: -1 })
    .limit(10)
    .select("name faculty department contributionPoints");

  // Get new users in the last 7 days
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: lastWeek },
  });

  return {
    totalUsers,
    newUsers,
    usersByRole,
    usersByFaculty,
    topContributors,
  };
};

module.exports = {
  getResourceStats,
  getUserStats,
};

// File: utils/connectToMongoDB.js - Database connection utility

const mongoose = require("mongoose");

const connectToMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
