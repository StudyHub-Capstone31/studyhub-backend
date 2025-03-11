// File: routes/forums.js - Discussion forum routes

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createForum,
  getAllForums,
  getForumById,
  updateForum,
  deleteForum,
  createPost,
  getPosts,
  updatePost,
  deletePost,
  likePost,
  reportPost,
  markPostAsAnswer,
} = require("../controllers/forums");
const upload = require("../middleware/upload");

// Forum routes
router.post("/", protect, createForum);
router.get("/", getAllForums);
router.get("/:id", getForumById);
router.put("/:id", protect, updateForum);
router.delete("/:id", protect, deleteForum);

// Post routes
router.post(
  "/:forumId/posts",
  protect,
  upload.array("attachments", 5),
  createPost
);
router.get("/:forumId/posts", getPosts);
router.put("/:forumId/posts/:postId", protect, updatePost);
router.delete("/:forumId/posts/:postId", protect, deletePost);
router.post("/:forumId/posts/:postId/like", protect, likePost);
router.post("/:forumId/posts/:postId/report", protect, reportPost);
router.post("/:forumId/posts/:postId/mark-answer", protect, markPostAsAnswer);

module.exports = router;
