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
