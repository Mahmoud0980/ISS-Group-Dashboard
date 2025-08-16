const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, enum: ["admin", "user"], default: "user" },
  allowedSections: [String],
  isProtected: { type: Boolean, default: false }, // ⬅️ جديد
});

module.exports = mongoose.model("User", userSchema);
