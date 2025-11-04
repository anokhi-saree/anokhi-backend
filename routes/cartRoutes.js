const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  removeItemFromCart,
  updateCart
} = require("../controllers/cartController");
const { isAuthenticated } = require("../middlewares/authMiddleware");

// Add item to cart
router.post("/add", isAuthenticated, addToCart);

// Get user cart
router.get("/", isAuthenticated, getCart);

// Remove item from cart
router.delete("/remove/:productId", isAuthenticated, removeItemFromCart);

//update item from customer point of view.
router.put("/update", isAuthenticated, updateCart);


module.exports = router;
