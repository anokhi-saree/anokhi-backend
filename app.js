const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");

const app = express();

// Security Middleware
app.use(cors({
  origin: 'https://anokhi-frontend-five.vercel.app/',
  credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes); // customer login functionality(DONE)
app.use("/api/admin", adminRoutes); // admin login functionality with product CRUD..(DONE) 
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes)


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

module.exports = { app };
