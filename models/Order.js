// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   items: [{
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true
//     },
//     quantity: {
//       type: Number,
//       required: true
//     },
//     price: {
//       type: Number,
//       required: true
//     }
//   }],
//   totalAmount: {
//     type: Number,
//     required: true
//   },
//   address: {  // Changed from String to Object
//     street: {
//       type: String,
//       required: true
//     },
//     city: {
//       type: String,
//       required: true
//     },
//     state: {
//       type: String,
//       required: true
//     },
//     postalCode: {
//       type: String,
//       required: true
//     }
//   },// take reference from the user schema itself while creating a new user
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['stripe','razorpay']
//   },
//   paymentStatus: {
//     type: String,
//     required: true,
//     enum: ['pending', 'completed', 'failed'],
//     default: 'pending'
//   },
//   orderStatus: {
//     type: String,
//     required: true,
//     enum: ['pending', 'processing', 'completed', 'cancelled'],
//     default: 'pending'
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Order', orderSchema);


const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      variant: { size: String, color: String }, // Handles size/color-based orders
    },
  ],
  totalAmount: { type: Number, required: true },
  couponCode: { type: String }, // New field
  discountAmount: { type: Number, default: 0 }, // New field
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  paymentMethod: { type: String, required: true, enum: ["stripe", "razorpay"] },
  paymentStatus: { type: String, required: true, enum: ["pending", "completed", "failed"], default: "pending" },
  orderStatus: { type: String, required: true, enum: ["pending", "processing", "completed", "cancelled"], default: "pending" },
  estimatedDelivery: { type: Date }, // New field
  isStockChecked: { type: Boolean, default: false }, // Prevents double stock validation
  orderNotes: { type: String, trim: true }, // New field
  cancellationReason: { type: String }, // New field
  refundStatus: { type: String, enum: ["not_requested", "processing", "completed"], default: "not_requested" } // New field
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
