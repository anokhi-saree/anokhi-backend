const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const ejs = require("ejs");
const path = require("path");

dotenv.config();

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // True for port 465, false for 587
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Send OTP Email (With Name)
exports.sendOTP = async (email, otp, name) => {
  try {
    const templatePath = path.join(__dirname, "../templates/otpEmail.ejs");
    const html = await ejs.renderFile(templatePath, { otp, name });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "Your OTP Code",
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email.");
  }
};

// Send Password Reset Email
exports.sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const templatePath = path.join(__dirname, "../templates/passwordResetEmail.ejs");

    const html = await ejs.renderFile(templatePath, { resetUrl });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "Password Reset Request",
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email.");
  }
};

// Send Order Confirmation Email (Customer)
exports.sendOrderConfirmation = async (email, order) => {
  try {
    const templatePath = path.join(__dirname, "../templates/orderConfirmation.ejs");
    const html = await ejs.renderFile(templatePath, { order });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "Your Order Confirmation",
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${email}`);
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    throw new Error("Failed to send order confirmation email.");
  }
};

// Send Order Notification Email (Admin)
exports.sendOrderNotification = async (adminEmail, order) => {
  try {
    const templatePath = path.join(__dirname, "../templates/orderNotification.ejs");
    const html = await ejs.renderFile(templatePath, { order });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: adminEmail,
      subject: "New Order Placed",
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order notification email sent to ${adminEmail}`);
  } catch (error) {
    console.error("Error sending order notification email:", error);
    throw new Error("Failed to send order notification email.");
  }
};
