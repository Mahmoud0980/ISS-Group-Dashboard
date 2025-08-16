const express = require("express");
const router = express.Router();
const multer = require("multer");

const Project = require("../models/Project");
const { STATUS } = require("../models/Project");

// نفس تخزين Cloudinary تبعك
const storage = require("../config/cloudinaryStorage");
const upload = multer({ storage });

/** GET: جميع المشاريع */
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().sort({ _id: -1 });
    res.json(projects);
  } catch (err) {
    console.error("Get projects:", err.message);
    res.status(500).json({ error: "فشل في جلب المشاريع" });
  }
});

/** POST: إضافة مشروع (multipart/form-data) */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      slug,
      title_ar,
      title_en,
      description_ar,
      description_en,
      company,
      startDate,
      status,
      link,
    } = req.body;

    if (
      !title_ar ||
      !title_en ||
      !description_ar ||
      !description_en ||
      !company ||
      !startDate ||
      !status ||
      !link
    ) {
      return res.status(400).json({ error: "يرجى تعبئة جميع الحقول" });
    }
    if (!STATUS.includes(status)) {
      return res.status(400).json({ error: "قيمة الحالة غير صحيحة" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "يجب رفع صورة للمشروع" });
    }

    const imageUrl = req.file.path; // رابط Cloudinary

    const project = new Project({
      slug,
      title_ar,
      title_en,
      description_ar,
      description_en,
      company,
      startDate, // يفضل إرسال YYYY-MM-DD من الواجهة
      status,
      image: imageUrl,
      link,
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error("Add project:", err.message);
    res.status(400).json({ error: "فشل في إضافة المشروع" });
  }
});

/** PUT: تعديل مشروع (multipart/form-data) — الصورة اختيارية */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const data = { ...req.body };

    // تحقق من الحالة لو مرسلة
    if (data.status && !STATUS.includes(data.status)) {
      return res.status(400).json({ error: "قيمة الحالة غير صحيحة" });
    }

    // لو في صورة جديدة
    if (req.file) data.image = req.file.path;

    const updated = await Project.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "المشروع غير موجود" });

    res.json(updated);
  } catch (err) {
    console.error("Update project:", err.message);
    res.status(400).json({ error: "فشل في تحديث المشروع" });
  }
});

/** DELETE: حذف مشروع */
router.delete("/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete project:", err.message);
    res.status(500).json({ error: "فشل في حذف المشروع" });
  }
});

module.exports = router;
