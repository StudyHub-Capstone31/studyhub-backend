const User = require("../models/User");
const Resource = require("../models/Resource");
const Forum = require("../models/Forum");
const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateUserProfile = asyncHandler(async (req, res, next) => {
  const { name, email, bio, interests } = req.body;

  // Find user and update
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, bio, interests },
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Change user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user
  const user = await User.findById(req.user.id);

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse("Current password is incorrect", 401));
  }

  // Set new password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

/**
 * @desc    Get resources created by user
 * @route   GET /api/users/resources
 * @access  Private
 */
exports.getUserResources = asyncHandler(async (req, res, next) => {
  const resources = await Resource.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: resources.length,
    data: resources,
  });
});

/**
 * @desc    Get resources saved by user
 * @route   GET /api/users/saved-resources
 * @access  Private
 */
exports.getUserSavedResources = asyncHandler(async (req, res, next) => {
  // Find user and populate saved resources
  const user = await User.findById(req.user.id).populate("savedResources");

  res.status(200).json({
    success: true,
    count: user.savedResources.length,
    data: user.savedResources,
  });
});

/**
 * @desc    Get forums created by user
 * @route   GET /api/users/forums
 * @access  Private
 */
exports.getUserForums = asyncHandler(async (req, res, next) => {
  const forums = await Forum.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: forums.length,
    data: forums,
  });
});

/**
 * @desc    Get user notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
exports.getUserNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/users/notifications/:id
 * @access  Private
 */
exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(
        `Notification not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Make sure notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse("Not authorized to update this notification", 401)
    );
  }

  notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Upload profile picture
 * @route   POST /api/users/profile-picture
 * @access  Private
 */
exports.uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { profilePicture: `/uploads/${req.file.filename}` },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});
