// File: routes/admin.js - Admin routes

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  approveResource,
  rejectResource,
  getAllPendingResources,
  getAllUsers,
  updateUserRole,
  getUserStatistics,
  getResourceStatistics,
  getForumStatistics,
  getDashboardStats,
} = require("../controllers/admin");

router.use(protect);
router.use(authorize("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/resources/pending", getAllPendingResources);
router.put("/resources/:id/approve", approveResource);
router.put("/resources/:id/reject", rejectResource);
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.get("/statistics/users", getUserStatistics);
router.get("/statistics/resources", getResourceStatistics);
router.get("/statistics/forums", getForumStatistics);

module.exports = router;
