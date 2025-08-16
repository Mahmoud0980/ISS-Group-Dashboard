// routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ===============================
// GET /api/users  -> جلب كل المستخدمين
// ===============================
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "فشل في جلب المستخدمين" });
  }
});

// ===============================
// POST /api/users  -> إضافة مستخدم جديد
// ===============================
router.post("/", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role = "user",
      allowedSections = [],
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "الاسم وكلمة المرور مطلوبة" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      role,
      allowedSections,
    });

    // لا ترجع كلمة المرور
    const { password: _, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (err) {
    res.status(400).json({ error: "فشل الإضافة" });
  }
});

// ===============================
// PUT /api/users/:id  -> تعديل معلومات المستخدم
// (اسم، بريد، كلمة مرور جديدة، الأقسام، الدور)
// ===============================
// routes/users.js (مقتطف مسار PUT)
// routes/users.js
router.put("/:id", auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ error: "المستخدم غير موجود" });

    const isSelf = String(req.user?.id) === String(targetUser._id);

    // مستخدم محمي: ممنوع أي شخص غيره يعدّل عليه
    if (targetUser.isProtected && !isSelf) {
      return res
        .status(403)
        .json({ error: "لا يمكن تعديل هذا المستخدم المحمي" });
    }

    // لا أحد يغيّر isProtected أبدًا
    delete req.body.isProtected;

    // لا تغيّر الدور للمستخدم المحمي (حتى نفسه)
    if (targetUser.isProtected) delete req.body.role;

    const updates = {
      email: req.body.email ?? targetUser.email,
      allowedSections: req.body.allowedSections ?? targetUser.allowedSections,
    };

    // السماح بتغيير الاسم:
    // - للمستخدم المحمي: فقط لو كان يغيّر نفسه
    // - لغير المحمي: عادي
    if (typeof req.body.username === "string") {
      const wantChangeUsername = req.body.username.trim();
      const canChangeUsername =
        !targetUser.isProtected || (targetUser.isProtected && isSelf);

      if (
        canChangeUsername &&
        wantChangeUsername &&
        wantChangeUsername !== targetUser.username
      ) {
        // تحقق عدم تكرار الاسم
        const exists = await User.findOne({
          username: wantChangeUsername,
          _id: { $ne: targetUser._id },
        });
        if (exists)
          return res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
        updates.username = wantChangeUsername;
      }
    }

    // تغيير كلمة المرور (للجميع بما فيهم المحمي لنفسه)
    if (req.body.password) {
      const bcrypt = require("bcryptjs");
      updates.password = await bcrypt.hash(req.body.password, 10);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    const { password, ...safe } = updated.toObject();
    res.json(safe);
  } catch (err) {
    res.status(400).json({ error: "فشل التحديث" });
  }
});

// ===============================
// PATCH /api/users/:id/permissions  -> تعديل الأقسام المسموحة فقط
// (مع حماية اسم DaniaM كمثال)
// ===============================
router.patch("/:id/permissions", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedSections } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    if (user.username === "DaniaM") {
      return res.status(403).json({ error: "لا يمكن تعديل صلاحيات DaniaM" });
    }

    user.allowedSections = Array.isArray(allowedSections)
      ? allowedSections
      : user.allowedSections;

    await user.save();

    const { password, ...safe } = user.toObject();
    res.json(safe);
  } catch (err) {
    res.status(400).json({ error: "فشل تعديل الصلاحيات" });
  }
});

// ===============================
// DELETE /api/users/:id  -> حذف مستخدم
// ===============================
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    if (user.isProtected || user.username === "DaniaM") {
      return res.status(403).json({ error: "لا يمكن حذف هذا المستخدم المحمي" });
    }

    await user.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "فشل الحذف" });
  }
});

module.exports = router;
