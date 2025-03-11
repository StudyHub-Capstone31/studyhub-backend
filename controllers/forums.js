// @desc    Update forum
// @route   PUT /api/forums/:id

const Forum = require("../models/Forum");
const Post = require("../models/Post");

// @access  Private
exports.updateForum = async (req, res, next) => {
  try {
    let forum = await Forum.findById(req.params.id);

    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is forum creator
    if (forum.createdBy.toString() !== req.user.id.toString()) {
      return next(
        new ErrorResponse(`User not authorized to update this forum`, 403)
      );
    }

    forum = await Forum.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: forum,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete forum
// @route   DELETE /api/forums/:id
// @access  Private
exports.deleteForum = async (req, res, next) => {
  try {
    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is forum creator or admin
    if (
      forum.createdBy.toString() !== req.user.id.toString() &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse(`User not authorized to delete this forum`, 403)
      );
    }

    // Delete all posts in the forum
    await Post.deleteMany({ forum: req.params.id });

    // Delete forum
    await forum.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts for a forum
// @route   GET /api/forums/:forumId/posts
// @access  Public
exports.getPosts = async (req, res, next) => {
  try {
    const forumId = req.params.forumId;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Post.countDocuments({ forum: forumId });

    // Get posts
    const posts = await Post.find({ forum: forumId })
      .skip(startIndex)
      .limit(limit)
      .sort({ isAnswer: -1, createdAt: -1 })
      .populate("author", "name role profilePicture");

    // Pagination result
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

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update post
// @route   PUT /api/forums/:forumId/posts/:postId
// @access  Private
exports.updatePost = async (req, res, next) => {
  try {
    const { forumId, postId } = req.params;
    const { content } = req.body;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Find post
    let post = await Post.findById(postId);
    if (!post || post.forum.toString() !== forumId) {
      return next(new ErrorResponse(`Post not found in this forum`, 404));
    }

    // Check if user is post author
    if (post.author.toString() !== req.user.id.toString()) {
      return next(
        new ErrorResponse(`User not authorized to update this post`, 403)
      );
    }

    // Update post
    post.content = content;
    post.isEdited = true;
    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete post
// @route   DELETE /api/forums/:forumId/posts/:postId
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const { forumId, postId } = req.params;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Find post
    const post = await Post.findById(postId);
    if (!post || post.forum.toString() !== forumId) {
      return next(new ErrorResponse(`Post not found in this forum`, 404));
    }

    // Check if user is post author or admin
    if (
      post.author.toString() !== req.user.id.toString() &&
      req.user.role !== "admin" &&
      forum.createdBy.toString() !== req.user.id.toString()
    ) {
      return next(
        new ErrorResponse(`User not authorized to delete this post`, 403)
      );
    }

    // Delete attachments if any
    if (post.attachments && post.attachments.length > 0) {
      post.attachments.forEach((attachment) => {
        try {
          fs.unlinkSync(attachment.fileUrl);
        } catch (err) {
          console.log("Error deleting file:", err);
        }
      });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Like/unlike post
// @route   POST /api/forums/:forumId/posts/:postId/like
// @access  Private
exports.likePost = async (req, res, next) => {
  try {
    const { forumId, postId } = req.params;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Find post
    const post = await Post.findById(postId);
    if (!post || post.forum.toString() !== forumId) {
      return next(new ErrorResponse(`Post not found in this forum`, 404));
    }

    // Check if user has already liked the post
    const liked = post.likes.includes(req.user.id);

    if (liked) {
      // Unlike post
      post.likes = post.likes.filter(
        (like) => like.toString() !== req.user.id.toString()
      );
    } else {
      // Like post
      post.likes.push(req.user.id);

      // Create notification if the author is not the current user
      if (post.author.toString() !== req.user.id.toString()) {
        await Notification.create({
          recipient: post.author,
          type: "post_like",
          message: `${req.user.name} liked your post in "${forum.title}"`,
          relatedTo: {
            model: "Forum",
            id: forumId,
          },
        });
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report post
// @route   POST /api/forums/:forumId/posts/:postId/report
// @access  Private
exports.reportPost = async (req, res, next) => {
  try {
    const { forumId, postId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return next(
        new ErrorResponse(`Please provide a reason for the report`, 400)
      );
    }

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Find post
    const post = await Post.findById(postId);
    if (!post || post.forum.toString() !== forumId) {
      return next(new ErrorResponse(`Post not found in this forum`, 404));
    }

    // Check if user has already reported the post
    const alreadyReported = post.reports.some(
      (report) => report.user.toString() === req.user.id.toString()
    );

    if (alreadyReported) {
      return next(
        new ErrorResponse(`You have already reported this post`, 400)
      );
    }

    // Add report
    post.reports.push({
      user: req.user.id,
      reason,
      date: Date.now(),
    });

    await post.save();

    // Notify admins about the report
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        type: "post_report",
        message: `A post in "${forum.title}" has been reported`,
        relatedTo: {
          model: "Forum",
          id: forumId,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { message: "Post reported successfully" },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Mark post as answer
// @route   POST /api/forums/:forumId/posts/:postId/mark-answer
// @access  Private
exports.markPostAsAnswer = async (req, res, next) => {
  try {
    const { forumId, postId } = req.params;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Check if user is the forum creator
    if (forum.createdBy.toString() !== req.user.id.toString()) {
      return next(
        new ErrorResponse(`Only the forum creator can mark answers`, 403)
      );
    }

    // Find post
    const post = await Post.findById(postId);
    if (!post || post.forum.toString() !== forumId) {
      return next(new ErrorResponse(`Post not found in this forum`, 404));
    }

    // Check if already an answer
    if (post.isAnswer) {
      post.isAnswer = false;
    } else {
      // Remove previous answer if exists
      await Post.updateMany(
        { forum: forumId, isAnswer: true },
        { isAnswer: false }
      );

      // Mark current post as answer
      post.isAnswer = true;

      // Create notification for post author
      if (post.author.toString() !== req.user.id.toString()) {
        await Notification.create({
          recipient: post.author,
          type: "post_marked_answer",
          message: `Your post in "${forum.title}" was marked as the answer`,
          relatedTo: {
            model: "Forum",
            id: forumId,
          },
        });
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create forum
// @route   POST /api/forums
// @access  Private
exports.createForum = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;

    const forum = await Forum.create(req.body);

    res.status(201).json({
      success: true,
      data: forum,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all forums
// @route   GET /api/forums
// @access  Public
exports.getAllForums = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Forum.countDocuments();

    // Query parameters
    const { search, category, sort } = req.query;

    // Build query
    let query = {};

    // Search by title or description
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // default newest first

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "active") {
      sortOption = { lastActivity: -1 };
    }

    const forums = await Forum.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort(sortOption)
      .populate("createdBy", "name role profilePicture");

    // Pagination result
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

    res.status(200).json({
      success: true,
      count: forums.length,
      pagination,
      data: forums,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get forum by ID
// @route   GET /api/forums/:id
// @access  Public
exports.getForumById = async (req, res, next) => {
  try {
    const forum = await Forum.findById(req.params.id).populate(
      "createdBy",
      "name role profilePicture"
    );

    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${req.params.id}`, 404)
      );
    }

    // Increment views
    forum.views += 1;
    await forum.save();

    res.status(200).json({
      success: true,
      data: forum,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create post in forum
// @route   POST /api/forums/:forumId/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const forumId = req.params.forumId;

    // Check if forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return next(
        new ErrorResponse(`Forum not found with id of ${forumId}`, 404)
      );
    }

    // Process attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments.push({
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          fileUrl: file.path,
        });
      });
    }

    // Create post
    const post = await Post.create({
      content: req.body.content,
      author: req.user.id,
      forum: forumId,
      attachments,
    });

    // Update forum's lastActivity
    forum.lastActivity = Date.now();
    await forum.save();

    // If this is not the forum creator posting, create notification
    if (forum.createdBy.toString() !== req.user.id.toString()) {
      await Notification.create({
        recipient: forum.createdBy,
        type: "new_forum_post",
        message: `${req.user.name} posted in your forum "${forum.title}"`,
        relatedTo: {
          model: "Forum",
          id: forumId,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};
