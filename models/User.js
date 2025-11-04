const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true
    },
    password: { 
      type: String, 
      minlength: 8,
      // Password is optional for Google-authenticated users
      required: function() { return !this.googleId; } 
    },
    phone: { 
      type: String, 
      required: false, // Optional for Google-authenticated users
      // unique: true, 
      // sparse: true, // Allows multiple null values for uniqueness
      // match: [/^[0-9]{10}$/, "Please fill a valid phone number"] 
    },
    address: { type: String, trim: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    isVerified: { type: Boolean, default: false }, // Email verification status

    // Google Authentication Fields
    googleId: { type: String, unique: true, sparse: true }, // Unique Google ID
    googleAccessToken: { type: String }, // Google access token
    googleRefreshToken: { type: String }, // Google refresh token

    resetPasswordToken: { type: String }, // Token for password reset
    resetPasswordExpires: { type: Date }, // Expiry for reset token

    // Security & Concurrency Features
    loginAttempts: { type: Number, default: 0 }, // Prevents brute-force attacks
    lastLogin: { type: Date }, // Tracks last login time
    sessionTokens: [{ type: String }], // Helps manage active sessions
  },
  { timestamps: true }
);


// Indexes for faster queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ phone: 1 });

module.exports = mongoose.model("User", UserSchema);