// // // Payment Verification and Email Notification
// // router.post('/verify-payment', async (req, res) => {
// //   try {
// //     const { order_id, payment_id, signature } = req.body;
// //     const order = await Order.findOne({ 'razorpay.order_id': order_id });
// //     if (!order) return res.status(404).json({ message: 'Order not found' });

// //     // Payment verification logic here
// //     order.paymentStatus = 'completed';
// //     order.orderStatus = 'pending';
// //     await order.save();

// //     // Email Notifications
// //     const mailOptions = {
// //       from: process.env.ADMIN_EMAIL,
// //       to: [req.user.email, process.env.ADMIN_EMAIL],
// //       subject: 'New Order Notification',
// //       text: `New order placed with ID: ${order._id}`,
// //     };
// //     await transporter.sendMail(mailOptions);

// //     res.status(200).json({ message: 'Payment verified and notifications sent' });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Payment verification failed', error });
// //   }
// // });

// // const { default: PQueue } = require('p-queue'); const queue = new PQueue({ concurrency: 1 }); // Atomic locking


const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const stripe = require("../config/stripe");
const Razorpay = require("razorpay");
const User = require("../models/User");
const { sendOrderConfirmation, sendOrderNotification } = require("../services/emailService");
const mongoose = require("mongoose");
const crypto=require('crypto')

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Checkout and create order
// exports.checkout = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { address, paymentMethod } = req.body;
//     const userId = req.user._id;

//     console.log("User ID from token:", userId);

//     // Validate address
//     if (!address || !address.street || !address.city || !address.state || !address.postalCode) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Valid address with street, city, state, and postal code is required" });
//     }

//     // Validate payment method
//     if (!paymentMethod || !["stripe", "razorpay"].includes(paymentMethod)) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Invalid payment method" });
//     }

//     // Validate user existence
//     const user = await User.findById(userId).session(session);
//     console.log("Found user:", user);

//     if (!user || !user.isVerified) {
//       await session.abortTransaction();
//       return res.status(404).json({
//         message: "User not found or not verified",
//         debug: { providedId: userId }
//       });
//     }

//     const customerEmail = user.email;

//     // Find the user's cart
//     const cart = await Cart.findOne({ user: userId }).populate("items.product").session(session);
//     console.log("Found cart:", cart);

//     if (!cart || cart.items.length === 0) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     // Store cart total price before clearing
//     const cartTotalPrice = cart.totalPrice;

//     // Check product stock and apply atomic locks
//     for (const item of cart.items) {
//       const product = await Product.findById(item.product._id).session(session);
//       if (!product || product.isDeleted) {
//         await session.abortTransaction();
//         return res.status(404).json({ message: `Product ${item.product.name} is no longer available` });
//       }

//       if (product.stock < item.quantity) {
//         await session.abortTransaction();
//         return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
//       }

//       if (product.stock - item.quantity <= 1) {
//         product.isOutOfStock = true;
//       }

//       product.stock -= item.quantity;
//       await product.save({ session });
//     }

//     // Validate total amount
//     if (cartTotalPrice <= 0) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Invalid total amount" });
//     }

//     // Create order
//     const order = new Order({
//       customerId: userId,
//       items: cart.items.map((item) => ({
//         productId: item.product._id,
//         quantity: item.quantity,
//         name: item.product.name,
//         price: item.product.price,
//       })),
//       totalAmount: cartTotalPrice,
//       paymentMethod,
//       paymentStatus: "pending",
//       orderStatus: "pending",
//       address,
//     });

//     console.log("Order details for email:", JSON.stringify(order, null, 2));

//     await order.save({ session });

//     // Delete the cart instead of emptying it
//     await Cart.findByIdAndDelete(cart._id, { session });

//     let paymentIntent;
//     if (paymentMethod === "stripe") {
//       // Create Stripe payment intent
//       try {
//         paymentIntent = await stripe.paymentIntents.create({
//           amount: Math.round(cartTotalPrice * 100),
//           currency: "inr",
//           metadata: { orderId: order._id.toString() },
//         });
//       } catch (stripeError) {
//         console.error("Stripe Error:", stripeError);
//         await session.abortTransaction();
//         return res.status(400).json({
//           message: "Payment processing failed",
//           error: stripeError.message,
//         });
//       }
//     } else if (paymentMethod === "razorpay") {
//       // Create Razorpay order
//       try {
//         const razorpayOrder = await razorpay.orders.create({
//           amount: Math.round(cartTotalPrice * 100), // Amount in paise
//           currency: "INR",
//           receipt: order._id.toString(),
//         });

//         paymentIntent = {
//           id: razorpayOrder.id,
//           client_secret: razorpayOrder.id, // Razorpay uses order ID as the client secret
//         };
//       } catch (razorpayError) {
//         console.error("Razorpay Error:", razorpayError);
//         await session.abortTransaction();
//         return res.status(400).json({
//           message: "Razorpay payment processing failed",
//           error: razorpayError.message,
//         });
//       }
//     }

//     await session.commitTransaction();

//     res.status(200).json({
//       message: "Order created successfully",
//       order,
//       clientSecret: paymentIntent.client_secret,
//     });

//     try {
//       await sendOrderConfirmation(customerEmail, order);
//       await sendOrderNotification(process.env.ADMIN_EMAIL, order);
//     } catch (emailError) {
//       console.error("Email notification error:", emailError);
//     }
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Checkout Error:", error);
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };
exports.checkout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { address, paymentMethod } = req.body;
    const userId = req.user._id;

    console.log("User ID from token:", userId);

    // Validate address
    if (!address || !address.street || !address.city || !address.state || !address.postalCode) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Valid address with street, city, state, and postal code is required" });
    }

    // Validate payment method
    if (!paymentMethod || !["stripe", "razorpay"].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Validate user existence
    const user = await User.findById(userId).session(session);
    console.log("Found user:", user);

    if (!user || !user.isVerified) {
      await session.abortTransaction();
      return res.status(404).json({
        message: "User not found or not verified",
        debug: { providedId: userId }
      });
    }

    const customerEmail = user.email;

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product").session(session);
    console.log("Found cart:", cart);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Log cart items with product details
    console.log("Cart items with product details:", JSON.stringify(cart.items, null, 2));

    // Store cart total price before clearing
    const cartTotalPrice = cart.totalPrice;

    // Check product stock and apply atomic locks
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id).session(session);
      if (!product || product.isDeleted) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Product ${item.product.name} is no longer available` });
      }

      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      if (product.stock - item.quantity <= 5) {
        product.isOutOfStock = true;
      }

      product.stock -= item.quantity;
      await product.save({ session });
    }

    // Validate total amount
    if (cartTotalPrice <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid total amount" });
    }

    // Create order
    const order = new Order({
      customerId: userId,
      items: cart.items.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalAmount: cartTotalPrice,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      address,
    });

    // Log the order object before saving
    console.log("Order object before saving:", JSON.stringify(order, null, 2));

    await order.save({ session });

    // Delete the cart instead of emptying it
    await Cart.findByIdAndDelete(cart._id, { session });

    // Create Stripe payment intent
    let paymentIntent;
    if (paymentMethod === "stripe") {
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(cartTotalPrice * 100),
          currency: "inr",
          metadata: { orderId: order._id.toString() },
        });
      } catch (stripeError) {
        console.error("Stripe Error:", stripeError);
        await session.abortTransaction();
        return res.status(400).json({
          message: "Payment processing failed",
          error: stripeError.message,
        });
      }
    } else if (paymentMethod === "razorpay") {
      // Create Razorpay order
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(cartTotalPrice * 100), // Amount in paise
          currency: "INR",
          receipt: order._id.toString(),
        });

        paymentIntent = {
          id: razorpayOrder.id,
          client_secret: razorpayOrder.id, // Razorpay uses order ID as the client secret
        };
      } catch (razorpayError) {
        console.error("Razorpay Error:", razorpayError);
        await session.abortTransaction();
        return res.status(400).json({
          message: "Razorpay payment processing failed",
          error: razorpayError.message,
        });
      }
    }

    await session.commitTransaction();

    // Log the order details for debugging
    console.log("Order details for email:", JSON.stringify(order, null, 2));

    res.status(200).json({
      message: "Order created successfully",
      order,
      clientSecret: paymentIntent.client_secret,
    });

    try {
      await sendOrderConfirmation(customerEmail, order);
      await sendOrderNotification(process.env.ADMIN_EMAIL, order);
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Checkout Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Confirm payment and update stock
// exports.confirmPayment = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { orderId } = req.body;
//     const userId = req.user._id;

//     console.log("Confirming payment for order:", orderId);
//     console.log("User ID:", userId);

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Invalid order ID" });
//     }

//     // Fetch the order and populate the productId field
//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'items.productId',
//         select: 'name price', // Include only the necessary fields
//       })
//       .session(session);

//     if (!order) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Order not found" });
//     }

//     if (order.customerId.toString() !== userId.toString()) {
//       await session.abortTransaction();
//       return res.status(403).json({ message: "Unauthorized access to order" });
//     }

//     if (order.paymentStatus === "completed") {
//       await session.abortTransaction();
//       return res.status(400).json({ message: "Order is already completed" });
//     }

//     // Find and delete the user's cart
//     await Cart.findOneAndDelete({ user: userId }, { session });

//     // Update order status
//     order.paymentStatus = "completed";
//     order.orderStatus = "completed";
//     order.completedAt = new Date();
//     await order.save({ session });

//     await session.commitTransaction();

//     // Log the order details for debugging
//     console.log("Order details for email:", JSON.stringify(order, null, 2));

//     res.status(200).json({
//       message: "Payment confirmed and order completed successfully",
//       order: {
//         orderId: order._id,
//         status: order.orderStatus,
//         paymentStatus: order.paymentStatus,
//         completedAt: order.completedAt,
//         totalAmount: order.totalAmount,
//       },
//     });

//     try {
//       const user = await User.findById(userId);
//       if (user && user.email) {
//         await sendOrderConfirmation(user.email, order);
//       }
//       await sendOrderNotification(process.env.ADMIN_EMAIL, order);
//     } catch (emailError) {
//       console.error("Email notification error:", emailError);
//     }
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Confirm Payment Error:", error);
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//       orderId: req.body.orderId,
//     });
//   } finally {
//     session.endSession();
//   }
// };

// Confirm payment and update stock
exports.confirmPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    console.log("Confirming payment for order:", orderId);
    console.log("User ID:", userId);
    console.log("Razorpay details:", { razorpay_payment_id, razorpay_order_id, razorpay_signature });

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Fetch the order and populate the productId field
    const order = await Order.findById(orderId)
      .populate({
        path: 'items.productId',
        select: 'name price', // Include only the necessary fields
      })
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Unauthorized access to order" });
    }

    if (order.paymentStatus === "completed") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Order is already completed" });
    }

    // Verify Razorpay signature if payment method is razorpay
    if (order.paymentMethod === 'razorpay' && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      
      if (generatedSignature !== razorpay_signature) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid Razorpay signature" });
      }
    }

    // Find and delete the user's cart
    await Cart.findOneAndDelete({ user: userId }, { session });

    // Update order status
    order.paymentStatus = "completed";
    order.orderStatus = "completed";
    order.completedAt = new Date();
    await order.save({ session });

    await session.commitTransaction();

    // Log the order details for debugging
    console.log("Order details for email:", JSON.stringify(order, null, 2));

    res.status(200).json({
      message: "Payment confirmed and order completed successfully",
      order: {
        orderId: order._id,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus,
        completedAt: order.completedAt,
        totalAmount: order.totalAmount,
      },
    });

    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendOrderConfirmation(user.email, order);
      }
      await sendOrderNotification(process.env.ADMIN_EMAIL, order);
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Confirm Payment Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      orderId: req.body.orderId,
    });
  } finally {
    session.endSession();
  }
};


// Add the new getCustomerOrders function
exports.getCustomerOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID" 
      });
    }
    
    console.log("Fetching orders for user:", userId);
    
    // Find all orders for the authenticated user
    const orders = await Order.find({ customerId: userId })
      .populate({
        path: "items.productId",
        select: "name images price description", // Include relevant product fields
      })
      .sort({ createdAt: -1 }) // Most recent orders first
      .lean(); // Convert to plain JavaScript objects for better performance
    
    console.log(`Found ${orders.length} orders for user`);
    
    // Transform the data to include product details in a cleaner format
    const transformedOrders = orders.map(order => {
      return {
        ...order,
        items: order.items.map(item => {
          return {
            ...item,
            productName: item.productId ? item.productId.name : 'Product no longer available',
            productImage: item.productId && item.productId.images ? item.productId.images[0] : null,
            // Keep the original productId reference
          };
        })
      };
    });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      orders: transformedOrders
    });
  } catch (error) {
    console.error("Get Customer Orders Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch orders", 
      error: error.message 
    });
  }
};