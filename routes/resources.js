const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  getUserResources,
  rateResource,
  uploadResourceFile,
  downloadResource,
  // Make sure all controller functions used in this file are properly imported
} = require("../controllers/resources");

// Basic routes
router
  .route("/")
  .get(getResources)
  .post(protect, authorize("publisher", "admin"), createResource);

router
  .route("/:id")
  .get(getResource)
  .put(protect, authorize("publisher", "admin"), updateResource)
  .delete(protect, authorize("publisher", "admin"), deleteResource);

// Additional routes - ensure these controller functions are defined
router.get("/user/:userId", getUserResources);
// Fix line 20 - ensure this controller function exists
router.post("/:id/rate", protect, rateResource);
router.post(
  "/:id/upload",
  protect,
  authorize("publisher", "admin"),
  uploadResourceFile
);
router.get("/:id/download", protect, downloadResource);

module.exports = router;
