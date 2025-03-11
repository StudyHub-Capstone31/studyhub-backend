// File: models/User.js - User model

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please provide a valid email",
      ],
      // Adding KNUST email validation if needed
      // validate: {
      //   validator: function(v) {
      //     return v.endsWith('@knust.edu.gh') || v.endsWith('@st.knust.edu.gh');
      //   },
      //   message: props => `${props.value} is not a valid KNUST email!`
      // }
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "lecturer", "admin", "alumni"],
      default: "student",
    },
    faculty: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    yearOfStudy: {
      type: Number,
      min: 1,
      max: 7, // Accounting for medical and some engineering programs
    },
    profilePicture: {
      type: String,
      default: "default-profile.jpg",
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    verified: {
      type: Boolean,
      default: true, // Change default to true since we're removing verification
    },
    contributionPoints: {
      type: Number,
      default: 0,
    },
    savedResources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check if password matches
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
