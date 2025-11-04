const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkoutController");
const paymentController = require("../controllers/paymentController");
const {isAuthenticated} = require("../middlewares/authMiddleware");

// Checkout routes
router.post("/checkout", isAuthenticated, checkoutController.checkout); // Create order and initiate payment
router.post("/confirm-payment", isAuthenticated, checkoutController.confirmPayment); // Create order and initiate payment
// router.post("/preorder", isAuthenticated, checkoutController.preorder); // Create preorder

router.get("/customer", isAuthenticated, checkoutController.getCustomerOrders);

// Payment routes
// router.post("/payment/success", isAuthenticated, paymentController.handlePaymentSuccess); // Handle payment success
// router.post("/payment/failure", isAuthenticated, paymentController.handlePaymentFailure); // Handle payment failure

// Stripe webhook route
router.post("/stripe-webhook", express.raw({ type: "application/json" }), paymentController.handleStripeWebhook);

module.exports = router;