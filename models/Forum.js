// File: models/Forum.js - Discussion forum model

const mongoose = require("mongoose");

const ForumSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: [
        "general",
        "course_specific",
        "faculty_specific",
        "department_specific",
        "technical",
        "other",
      ],
      required: true,
    },
    faculty: {
      type: String,
    },
    department: {
      type: String,
    },
    course: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Forum", ForumSchema);
