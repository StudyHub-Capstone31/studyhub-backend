// File: routes/users.js - User management routes

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserResources,
  getUserSavedResources,
  getUserForums,
  getUserNotifications,
  markNotificationAsRead,
  uploadProfilePicture,
} = require("../controllers/users");
const upload = require("../middleware/upload");

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
router.get("/resources", protect, getUserResources);
router.get("/saved-resources", protect, getUserSavedResources);
router.get("/forums", protect, getUserForums);
router.get("/notifications", protect, getUserNotifications);
router.put("/notifications/:id", protect, markNotificationAsRead);
router.post(
  "/profile-picture",
  protect,
  upload.single("profilePicture"),
  uploadProfilePicture
);

module.exports = router;
