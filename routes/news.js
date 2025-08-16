// routes/news.js
const express = require("express");
const router = express.Router();
const News = require("../models/News");

// تنسيق للتاريخ يناسب input date
const formatForInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// جلب كل الأخبار
router.get("/", async (_req, res) => {
  try {
    const news = await News.find().sort({ date: -1 });
    const mapped = news.map((n) => ({
      slug: n.slug,
      _id: n._id,
      title_ar: n.title_ar,
      title_en: n.title_en,
      summary_ar: n.summary_ar,
      summary_en: n.summary_en,
      // نعيد التاريخ بصيغة YYYY-MM-DD لتتعبّى مباشرة في الحقول
      date: n.date ? formatForInput(n.date) : "",
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "فشل في جلب الأخبار" });
  }
});

// إضافة خبر
router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.date) body.date = new Date(body.date); // استقبلنا YYYY-MM-DD
    const news = await News.create(body);
    res.status(201).json(news);
  } catch (err) {
    res.status(400).json({ error: "فشل في إضافة الخبر" });
  }
});

// تحديث خبر
router.put("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.date) body.date = new Date(body.date); // استقبلنا YYYY-MM-DD
    const updated = await News.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "فشل في تحديث الخبر" });
  }
});

// حذف خبر
router.delete("/:id", async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "فشل في حذف الخبر" });
  }
});

module.exports = router;
