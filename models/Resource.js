// File: models/Resource.js - Academic resource model

const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    type: {
      type: String,
      enum: [
        "lecture_note",
        "past_question",
        "e_book",
        "tutorial_video",
        "article",
        "other",
      ],
      required: true,
    },
    faculty: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ["100", "200", "300", "400", "500", "600", "700", "all"],
      required: true,
    },
    semester: {
      type: String,
      enum: ["1", "2", "both"],
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: [
        "pdf",
        "doc",
        "ppt",
        "xls",
        "jpg",
        "png",
        "mp4",
        "mp3",
        "zip",
        "other",
      ],
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        value: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// Calculate average rating before saving
ResourceSchema.pre("save", function (next) {
  if (this.ratings.length > 0) {
    this.averageRating =
      this.ratings.reduce((sum, rating) => sum + rating.value, 0) /
      this.ratings.length;
  }
  next();
});

module.exports = mongoose.model("Resource", ResourceSchema);
