const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
require("dotenv").config();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Payment schema
const paymentSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  amount: Number,
  orderId: String,
  paymentId: String,
  status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
  createdAt: { type: Date, default: Date.now }
});
const Payment = mongoose.model("Payment", paymentSchema);

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
app.post("/create-order", async (req, res) => {
  const { name, email, phone, amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    const payment = new Payment({ name, email, phone, amount, orderId: order.id });
    await payment.save();

    res.json({ orderId: order.id, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error creating order" });
  }
});

// Verify payment
app.post("/verify-payment", async (req, res) => {
  const { orderId, paymentId, status } = req.body;
  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ success: false });

    payment.paymentId = paymentId;
    payment.status = status;
    await payment.save();

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
