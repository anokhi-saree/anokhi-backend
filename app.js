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
  origin: [
    'http://localhost:3000',
    'https://anokhi-frontend-five.vercel.app',
    'https://www.anokhi.org.in'
  ],
  credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is active 🚀" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

setInterval(() => {
  fetch(`${SERVER_URL}/health`)
    .then(() => console.log(`🔁 Pinged ${SERVER_URL}/health successfully`))
    .catch((err) => console.error("⚠️ Self ping failed:", err.message));
}, 10 * 60 * 1000);

module.exports = { app };
