const express = require("express");
const { body } = require("express-validator");
const {
  createAdmin,
  verifyAdminOTP,
  forgotPassword,
  resetPassword,
  adminLogin,
  addProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct
} = require("../controllers/adminController");
const {isAdmin}=require('../middlewares/authMiddleware')

const router = express.Router();

// Validation rules
const validateEmail = body("email").isEmail().withMessage("Invalid email format");
const validatePassword = body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters");
const validateOTP = body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits");
const validateNewPassword = body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters");

// Routes
router.post("/register", [validateEmail, validatePassword], createAdmin);
router.post("/verify-otp", [validateEmail, validateOTP, validatePassword], verifyAdminOTP);
router.post("/forgot-password", [validateEmail], forgotPassword);
router.post("/reset-password", [validateEmail, validateOTP, validateNewPassword], resetPassword);
router.post("/login",[body("email").isEmail().withMessage("Enter a valid email"),body("password").notEmpty().withMessage("Password is required"),],adminLogin);


// Product management routes
router.post("/products", isAdmin, addProduct);
router.put("/products/:id", isAdmin, updateProduct);
router.delete("/products/:id", isAdmin, deleteProduct);
router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);

module.exports = router;