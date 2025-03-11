const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Resource = require("../models/Resource");
const User = require("../models/User");
const Forum = require("../models/Forum");
const Post = require("../models/Post");

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get counts of various entities
  const userCount = await User.countDocuments();
  const resourceCount = await Resource.countDocuments();
  const pendingResourceCount = await Resource.countDocuments({
    status: "pending",
  });
  const forumCount = await Forum.countDocuments();
  const postCount = await Post.countDocuments();

  // Get recent users and resources
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
  const recentResources = await Resource.find()
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: userCount,
        resources: resourceCount,
        pendingResources: pendingResourceCount,
        forums: forumCount,
        posts: postCount,
      },
      recent: {
        users: recentUsers,
        resources: recentResources,
      },
    },
  });
});

/**
 * @desc    Get all resources pending approval
 * @route   GET /api/v1/admin/resources/pending
 * @access  Private/Admin
 */
exports.getAllPendingResources = asyncHandler(async (req, res, next) => {
  const resources = await Resource.find({ status: "pending" }).populate(
    "user",
    "name email"
  );

  res.status(200).json({
    success: true,
    count: resources.length,
    data: resources,
  });
});

/**
 * @desc    Approve a resource
 * @route   PUT /api/v1/admin/resources/:id/approve
 * @access  Private/Admin
 */
exports.approveResource = asyncHandler(async (req, res, next) => {
  let resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  resource.status = "approved";
  await resource.save();

  res.status(200).json({
    success: true,
    data: resource,
  });
});

/**
 * @desc    Reject a resource
 * @route   PUT /api/v1/admin/resources/:id/reject
 * @access  Private/Admin
 */
exports.rejectResource = asyncHandler(async (req, res, next) => {
  let resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  resource.status = "rejected";
  if (req.body.rejectionReason) {
    resource.rejectionReason = req.body.rejectionReason;
  }

  await resource.save();

  res.status(200).json({
    success: true,
    data: resource,
  });
});

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * @desc    Update user role
 * @route   PUT /api/v1/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;

  // Validate role
  if (!role || !["user", "publisher", "admin"].includes(role)) {
    return next(new ErrorResponse("Please provide a valid role", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Get user statistics
 * @route   GET /api/v1/admin/statistics/users
 * @access  Private/Admin
 */
exports.getUserStatistics = asyncHandler(async (req, res, next) => {
  // Total users
  const totalUsers = await User.countDocuments();

  // Users by role
  const usersByRole = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  // Users registered in the last month
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: lastMonth },
  });

  // Active users (users who have logged in within the past week)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: lastWeek },
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      usersByRole,
      newUsers,
      activeUsers,
    },
  });
});

/**
 * @desc    Get resource statistics
 * @route   GET /api/v1/admin/statistics/resources
 * @access  Private/Admin
 */
exports.getResourceStatistics = asyncHandler(async (req, res, next) => {
  // Total resources
  const totalResources = await Resource.countDocuments();

  // Resources by status
  const resourcesByStatus = await Resource.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Resources by category
  const resourcesByCategory = await Resource.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  // Resources added in the last month
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const newResources = await Resource.countDocuments({
    createdAt: { $gte: lastMonth },
  });

  res.status(200).json({
    success: true,
    data: {
      totalResources,
      resourcesByStatus,
      resourcesByCategory,
      newResources,
    },
  });
});

/**
 * @desc    Get forum statistics
 * @route   GET /api/v1/admin/statistics/forums
 * @access  Private/Admin
 */
exports.getForumStatistics = asyncHandler(async (req, res, next) => {
  // Total forums
  const totalForums = await Forum.countDocuments();

  // Total posts
  const totalPosts = await Post.countDocuments();

  // Most active forums
  const mostActiveForums = await Post.aggregate([
    { $group: { _id: "$forum", postCount: { $sum: 1 } } },
    { $sort: { postCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "forums",
        localField: "_id",
        foreignField: "_id",
        as: "forumDetails",
      },
    },
    { $unwind: "$forumDetails" },
    { $project: { forumName: "$forumDetails.name", postCount: 1 } },
  ]);

  // Posts in the last week
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const recentPosts = await Post.countDocuments({
    createdAt: { $gte: lastWeek },
  });

  res.status(200).json({
    success: true,
    data: {
      totalForums,
      totalPosts,
      mostActiveForums,
      recentPosts,
    },
  });
});
