const Cart = require("../models/Cart");
const Product = require("../models/Product");
const mongoose=require('mongoose')

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { product, quantity } = req.body;

    if (!product || !quantity) {
      return res.status(400).json({ message: "Product and quantity are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    const productData = await Product.findById(product);
    if (!productData) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product._id.toString() === product
    );
    
    if (itemIndex >= 0) {
      // Update existing item
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].price = productData.price; // Ensure price is set
    } else {
      // Add new item with all required fields
      cart.items.push({
        product,
        quantity,
        price: productData.price, // Include the price from the product
        variant: {} // Add empty variant object if needed
      });
    }

    // Calculate total price safely
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.quantity * (item.price || 0));
    }, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message
    });
  }
};


// Get user cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// Remove item from cart
exports.removeItemFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(item => item.product._id.toString() !== productId);

    cart.totalPrice = cart.items.reduce((total, item) => total + item.quantity * item.product.price, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update cart item quantity
exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId);

    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity = quantity;
      if (quantity === 0) {
        cart.items.splice(itemIndex, 1); // Remove item if quantity is 0
      }
    } else {
      return res.status(404).json({ message: "Item not in cart" });
    }

    cart.totalPrice = cart.items.reduce((total, item) => total + item.quantity * item.product.price, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};