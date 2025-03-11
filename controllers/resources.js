// File: controllers/resources.js - Resource controller (partial implementation)

const Resource = require("../models/Resource");
const User = require("../models/User");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// @desc    Upload resource
// @route   POST /api/resources
// @access  Private
exports.uploadResource = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const {
      title,
      description,
      type,
      faculty,
      department,
      course,
      level,
      semester,
      academicYear,
      tags,
    } = req.body;

    // Create resource
    const resource = await Resource.create({
      title,
      description,
      type,
      faculty,
      department,
      course,
      level,
      semester,
      academicYear,
      fileUrl: req.file.path,
      fileType: path.extname(req.file.originalname).substring(1),
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
    });

    // Update user contribution points
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { contributionPoints: 5 },
    });

    // Notify admin about new resource
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        type: "system",
        message: `New resource "${title}" uploaded by ${req.user.name} is waiting for approval`,
        relatedTo: {
          model: "Resource",
          id: resource._id,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
exports.getAllResources = async (req, res, next) => {
  try {
    let query = { approved: true };

    // Build filter object
    const { faculty, department, course, level, type, semester } = req.query;
    if (faculty) query.faculty = faculty;
    if (department) query.department = department;
    if (course) query.course = course;
    if (level) query.level = level;
    if (type) query.type = type;
    if (semester) query.semester = semester;

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Resource.countDocuments(query);

    // Execute query
    const resources = await Resource.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role profilePicture");

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
      count: resources.length,
      pagination,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get resource by ID
// @route   GET /api/resources/:id
// @access  Public
exports.getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("uploadedBy", "name role profilePicture")
      .populate("approvedBy", "name role");

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Increment view count
    resource.views += 1;
    await resource.save();

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download resource
// @route   GET /api/resources/:id/download
// @access  Public
exports.downloadResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (!resource.approved) {
      return res.status(403).json({
        success: false,
        message: "This resource is not yet approved for download",
      });
    }

    // Increment download count
    resource.downloads += 1;
    await resource.save();

    const filePath = resource.fileUrl;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    res.download(filePath, `${resource.title}.${resource.fileType}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private (Owner or Admin)
exports.updateResource = async (req, res, next) => {
  try {
    let resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check ownership or admin role
    if (
      resource.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this resource",
      });
    }

    // Update fields
    const updatableFields = [
      "title",
      "description",
      "type",
      "faculty",
      "department",
      "course",
      "level",
      "semester",
      "academicYear",
      "tags",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "tags" && typeof req.body.tags === "string") {
          resource[field] = req.body.tags.split(",").map((tag) => tag.trim());
        } else {
          resource[field] = req.body[field];
        }
      }
    });

    // If file is being updated
    if (req.file) {
      // Remove old file
      if (fs.existsSync(resource.fileUrl)) {
        fs.unlinkSync(resource.fileUrl);
      }

      // Update file info
      resource.fileUrl = req.file.path;
      resource.fileType = path.extname(req.file.originalname).substring(1);
      resource.fileSize = req.file.size;
    }

    // If admin is updating approval status
    if (req.user.role === "admin" && req.body.approved !== undefined) {
      resource.approved = req.body.approved;
      resource.approvedBy = req.user.id;
      resource.approvedAt = Date.now();

      // Notify uploader
      await Notification.create({
        recipient: resource.uploadedBy,
        type: "system",
        message: `Your resource "${resource.title}" has been ${
          resource.approved ? "approved" : "rejected"
        }`,
        relatedTo: {
          model: "Resource",
          id: resource._id,
        },
      });
    }

    await resource.save();

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Owner or Admin)
exports.deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check ownership or admin role
    if (
      resource.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this resource",
      });
    }

    // Delete the file from the filesystem
    if (fs.existsSync(resource.fileUrl)) {
      fs.unlinkSync(resource.fileUrl);
    }

    // Delete any notifications related to this resource
    await Notification.deleteMany({
      "relatedTo.model": "Resource",
      "relatedTo.id": resource._id,
    });

    // Delete the resource
    await resource.remove();

    res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending resources (for admin)
// @route   GET /api/resources/pending
// @access  Private (Admin only)
exports.getPendingResources = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    const resources = await Resource.find({ approved: false })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role profilePicture");

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search resources
// @route   GET /api/resources/search
// @access  Public
exports.searchResources = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search term",
      });
    }

    const resources = await Resource.find({
      approved: true,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role profilePicture");

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate resource
// @route   POST /api/resources/:id/rate
// @access  Private
exports.rateResource = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const { id } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rating between 1 and 5",
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (!resource.approved) {
      return res.status(403).json({
        success: false,
        message: "Cannot rate unapproved resources",
      });
    }

    // Check if user already rated the resource
    const existingRatingIndex = resource.ratings.findIndex(
      (r) => r.user.toString() === req.user.id
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      resource.ratings[existingRatingIndex].rating = rating;
      if (comment) {
        resource.ratings[existingRatingIndex].comment = comment;
      }
    } else {
      // Add new rating
      resource.ratings.push({
        user: req.user.id,
        rating,
        comment: comment || "",
      });
    }

    // Calculate average rating
    const totalRating = resource.ratings.reduce(
      (sum, item) => sum + item.rating,
      0
    );
    resource.averageRating = totalRating / resource.ratings.length;

    await resource.save();

    // Notify resource uploader about the rating
    if (resource.uploadedBy.toString() !== req.user.id) {
      await Notification.create({
        recipient: resource.uploadedBy,
        type: "system",
        message: `Your resource "${resource.title}" received a new rating`,
        relatedTo: {
          model: "Resource",
          id: resource._id,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get resources by user
// @route   GET /api/resources/user/:userId
// @access  Public
exports.getResourcesByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const resources = await Resource.find({
      uploadedBy: userId,
      approved: true,
    })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role profilePicture");

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save resource to user's collection
// @route   POST /api/resources/:id/save
// @access  Private
exports.saveResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (!resource.approved) {
      return res.status(403).json({
        success: false,
        message: "Cannot save unapproved resources",
      });
    }

    const user = await User.findById(req.user.id);

    // Check if already saved
    const isSaved = user.savedResources.includes(resource._id);

    if (isSaved) {
      // Remove from saved collection
      user.savedResources = user.savedResources.filter(
        (id) => id.toString() !== resource._id.toString()
      );
      await user.save();

      return res.status(200).json({
        success: true,
        saved: false,
        message: "Resource removed from your saved collection",
      });
    } else {
      // Add to saved collection
      user.savedResources.push(resource._id);
      await user.save();

      return res.status(200).json({
        success: true,
        saved: true,
        message: "Resource saved to your collection",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get available filter options
// @route   GET /api/resources/filters
// @access  Public
exports.getFilterOptions = async (req, res, next) => {
  try {
    const faculties = await Resource.distinct("faculty", { approved: true });
    const departments = await Resource.distinct("department", {
      approved: true,
    });
    const courses = await Resource.distinct("course", { approved: true });
    const levels = await Resource.distinct("level", { approved: true });
    const types = await Resource.distinct("type", { approved: true });
    const semesters = await Resource.distinct("semester", { approved: true });

    res.status(200).json({
      success: true,
      data: {
        faculties,
        departments,
        courses,
        levels,
        types,
        semesters,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all resources
 * @route   GET /api/v1/resources
 * @access  Public
 */
exports.getResources = asyncHandler(async (req, res, next) => {
  // Add pagination, filtering, etc.
  const resources = await Resource.find({ status: "approved" }).populate(
    "user",
    "name"
  );

  res.status(200).json({
    success: true,
    count: resources.length,
    data: resources,
  });
});

/**
 * @desc    Get single resource
 * @route   GET /api/v1/resources/:id
 * @access  Public
 */
exports.getResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findById(req.params.id).populate(
    "user",
    "name"
  );

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: resource,
  });
});

/**
 * @desc    Create new resource
 * @route   POST /api/v1/resources
 * @access  Private
 */
exports.createResource = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // If user is not an admin, set status to pending
  if (req.user.role !== "admin") {
    req.body.status = "pending";
  }

  const resource = await Resource.create(req.body);

  res.status(201).json({
    success: true,
    data: resource,
  });
});

/**
 * @desc    Update resource
 * @route   PUT /api/v1/resources/:id
 * @access  Private
 */
exports.updateResource = asyncHandler(async (req, res, next) => {
  let resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is resource owner or admin
  if (resource.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this resource`,
        401
      )
    );
  }

  // If user is not an admin and changing content, set status back to pending
  if (req.user.role !== "admin") {
    req.body.status = "pending";
  }

  resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: resource,
  });
});

/**
 * @desc    Delete resource
 * @route   DELETE /api/v1/resources/:id
 * @access  Private
 */
exports.deleteResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is resource owner or admin
  if (resource.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this resource`,
        401
      )
    );
  }

  await resource.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get resources by user
 * @route   GET /api/v1/resources/user/:userId
 * @access  Public
 */
exports.getUserResources = asyncHandler(async (req, res, next) => {
  const resources = await Resource.find({
    user: req.params.userId,
    status: "approved",
  });

  res.status(200).json({
    success: true,
    count: resources.length,
    data: resources,
  });
});

/**
 * @desc    Rate a resource
 * @route   POST /api/v1/resources/:id/rate
 * @access  Private
 */
exports.rateResource = asyncHandler(async (req, res, next) => {
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(
      new ErrorResponse(`Please provide a rating between 1 and 5`, 400)
    );
  }

  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user has already rated this resource
  const alreadyRated = resource.ratings.find(
    (item) => item.user.toString() === req.user.id
  );

  if (alreadyRated) {
    // Update existing rating
    alreadyRated.rating = rating;
    if (review) alreadyRated.review = review;
  } else {
    // Add new rating
    resource.ratings.push({
      user: req.user.id,
      rating,
      review: review || "",
    });
  }

  // Calculate average rating
  const totalRatings = resource.ratings.reduce(
    (acc, item) => acc + item.rating,
    0
  );
  resource.averageRating = totalRatings / resource.ratings.length;

  await resource.save();

  res.status(200).json({
    success: true,
    averageRating: resource.averageRating,
    data: resource,
  });
});

/**
 * @desc    Upload resource file
 * @route   POST /api/v1/resources/:id/upload
 * @access  Private
 */
exports.uploadResourceFile = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is resource owner or admin
  if (resource.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this resource`,
        401
      )
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload a file less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `resource_${resource._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Resource.findByIdAndUpdate(req.params.id, { file: file.name });

    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});

/**
 * @desc    Download resource file
 * @route   GET /api/v1/resources/:id/download
 * @access  Private
 */
exports.downloadResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404)
    );
  }

  if (!resource.file) {
    return next(
      new ErrorResponse(`This resource has no file to download`, 404)
    );
  }

  const filePath = `${process.env.FILE_UPLOAD_PATH}/${resource.file}`;

  res.download(filePath, resource.file, (err) => {
    if (err) {
      return next(new ErrorResponse(`Error downloading file`, 500));
    }
  });
});
