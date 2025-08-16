const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// تسجيل الدخول
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // البحث عن المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "اسم المستخدم غير صحيح" });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    // التحقق من وجود سر التوقيع
    if (!process.env.JWT_SECRET) {
      console.error(" JWT_SECRET غير محدد في البيئة");
      return res.status(500).json({ error: "خطأ في الإعدادات" });
    }

    // إنشاء التوكن
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username, // 🔹 إضافة اسم المستخدم
        role: user.role,
        allowedSections: user.allowedSections || [], // 🔹 التأكد من أن القيمة مصفوفة
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // إرجاع التوكن
    res.json({ token });
  } catch (err) {
    console.error("❌ خطأ في تسجيل الدخول:", err);
    res.status(500).json({ error: "خطأ في تسجيل الدخول" });
  }
});

module.exports = router;
