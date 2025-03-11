const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Create upload directories if they don't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const resourcesDir = path.join("uploads", "resources");
const profilesDir = path.join("uploads", "profiles");
const attachmentsDir = path.join("uploads", "attachments");

createDir(resourcesDir);
createDir(profilesDir);
createDir(attachmentsDir);

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = resourcesDir;

    // Determine upload directory based on file type or route
    if (req.baseUrl.includes("profile-picture")) {
      uploadPath = profilesDir;
    } else if (req.baseUrl.includes("posts")) {
      uploadPath = attachmentsDir;
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow specific file types
  const allowedFileTypes = {
    "image/jpeg": true,
    "image/png": true,
    "image/gif": true,
    "application/pdf": true,
    "application/msword": true,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
    "application/vnd.ms-excel": true,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
    "application/vnd.ms-powerpoint": true,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
    "video/mp4": true,
    "audio/mpeg": true,
    "application/zip": true,
    "application/x-zip-compressed": true,
  };

  if (allowedFileTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "File type not supported. Allowed types: images, documents, presentations, spreadsheets, PDF, ZIP, audio and video files."
      ),
      false
    );
  }
};

// File size limits
const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;
