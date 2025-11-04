const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const moment = require("moment");
const { validationResult } = require("express-validator");
const { sendOTP } = require("../services/emailService");
const Product=require('../models/Product')
const upload=require('../middlewares/upload')

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const otpStore = new Map();

// Admin Registration with OTP Verification
exports.createAdmin = async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const otpCode = generateOTP();
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    otpStore.set(email, { otpHash, otpExpiry: moment().add(10, "minutes").toDate(), name, phone });
    
    await sendOTP(email, otpCode, name);
    res.status(200).json({ message: "OTP sent to email. Verify to complete registration." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP and Register Admin
exports.verifyAdminOTP = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const otpData = otpStore.get(email);

    if (!otpData || moment().isAfter(otpData.otpExpiry)) {
      otpStore.delete(email);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (crypto.createHash("sha256").update(otp).digest("hex") !== otpData.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newAdmin = await User.create({ ...otpData, email, password: hashedPassword, role: "admin", isVerified: true });
    otpStore.delete(email);

    const token = jwt.sign({ id: newAdmin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ message: "Admin registered successfully", token, newAdmin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ message: "Login successful", token, admin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otpCode = generateOTP();
    admin.otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    admin.otpExpiry = moment().add(10, "minutes").toDate();
    await admin.save();

    await sendOTP(email, otpCode, admin.name);
    res.status(200).json({ message: "OTP sent to email." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await User.findOne({ email, role: "admin" });

    if (!admin || !admin.otpHash || moment().isAfter(admin.otpExpiry) || crypto.createHash("sha256").update(otp).digest("hex") !== admin.otpHash) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    admin.otpHash = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const multer=require('multer')
// Add a new product
exports.addProduct = [
  (req, res, next) => {
    upload.array("images", 5)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        return res.status(400).json({ message: "File upload error", error: err.message });
      } else if (err) {
        // Other errors
        return res.status(500).json({ message: "Server error", error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, description, price, discountedPrice, category, stock, isFeatured,specifications} = req.body;
 
      // Validate required fields
      if (!name || !description || !price || !category || !stock) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get uploaded image URLs
      const images = req.files.map((file) => file.location);

      // Create a new product
      const product = new Product({
        name,
        description,
        price,
        discountedPrice,
        category,
        images,
        stock,
        isFeatured,
        specifications
      });

      await product.save();

      res.status(201).json({ message: "Product added successfully", product });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];


// Update a product
exports.updateProduct = [
  (req, res, next) => {
    upload.array("images", 5)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: "File upload error", error: err.message });
      } else if (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate if the product exists
      let product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if new images are uploaded
      if (req.files && req.files.length > 0) {
        const newImageUrls = req.files.map((file) => file.location); // Extract URLs from uploaded files
        updateData.images = newImageUrls; // Replace old images with new ones
        // updateData.images = [...product.images, ...newImageUrls]; // Append new images instead of replacing
      }

      // Update the product
      product = await Product.findByIdAndUpdate(id, updateData, { new: true });

      res.status(200).json({ message: "Product updated successfully", product });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete the product
    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all products (for admin)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const generateDiscountCode = () => {
  return `DISC-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

// Create a Discount Code
exports.createDiscount = async (req, res) => {
  try {
    const { discountPercentage, expiryDate, usageLimit } = req.body;
    const code = generateDiscountCode();

    // Store discount details somewhere (can use DB or a JSON file)
    const discountData = { code, discountPercentage, expiryDate, usageLimit, used: 0 };

    // Simulating DB storage (replace with actual DB implementation)
    global.discounts = global.discounts || {};
    global.discounts[code] = discountData;

    res.status(201).json({ message: "Discount created successfully", discount: discountData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🎟️ Get All Discounts
exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find();
    res.status(200).json({ discounts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🎟️ Update Discount Code
exports.updateDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const updates = req.body;
    const updatedDiscount = await Discount.findByIdAndUpdate(discountId, updates, { new: true });
    res.status(200).json({ message: "Discount updated", updatedDiscount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🎟️ Delete Discount Code
exports.deleteDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    await Discount.findByIdAndDelete(discountId);
    res.status(200).json({ message: "Discount deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📊 Get Sales Summary
exports.getSalesSummary = async (req, res) => {
  try {
    const totalSales = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
    res.status(200).json({ totalSales: totalSales[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📦 Get Low-Stock Alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({ stock: { $lt: 5 } });
    res.status(200).json({ lowStockProducts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📦 Restock Product
exports.restockProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.stock += stock;
    await product.save();

    res.status(200).json({ message: "Product restocked successfully", product });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🔄 Bulk Order Processing
// exports.bulkUpdateOrderStatus = async (req, res) => {
//   try {
//     const { orderIds, status } = req.body;

//     const updatedOrders = await Order.updateMany(
//       { _id: { $in: orderIds } },
//       { $set: { orderStatus: status } }
//     );

//     res.status(200).json({ message: "Orders updated successfully", updatedOrders });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };