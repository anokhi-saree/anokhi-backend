const Order = require("../models/Order");
const { sendOrderConfirmation, sendOrderNotification } = require("../services/emailService");

// Handle Stripe webhook for payment success
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (error) {
    console.error("Stripe Webhook Error:", error);
    return res.status(400).json({ message: "Webhook error" });
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Update payment status
      order.paymentStatus = "completed";
      order.orderStatus = "shipped";
      await order.save();

      // Send email notifications
      await sendOrderConfirmation(order.customerId.email, order); // Send to customer
      await sendOrderNotification(process.env.ADMIN_EMAIL, order); // Send to admin

      break;

    case "payment_intent.payment_failed":
      const failedPaymentIntent = event.data.object;
      const failedOrderId = failedPaymentIntent.metadata.orderId;

      // Find the order
      const failedOrder = await Order.findById(failedOrderId);
      if (!failedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Update payment status
      failedOrder.paymentStatus = "failed";
      failedOrder.orderStatus = "cancelled";
      await failedOrder.save();

      // Send email notifications
      await sendOrderConfirmation(failedOrder.customerId.email, failedOrder); // Send to customer
      await sendOrderNotification(process.env.ADMIN_EMAIL, failedOrder); // Send to admin

      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};