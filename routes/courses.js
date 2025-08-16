// routes/courses.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Course = require("../models/Course");
const { _getClient } = require("../config/googleSheets");

// لو عندك Cloudinary storage:
const storage = require("../config/cloudinaryStorage");
// لو ما عندك، مؤقتًا استبدل السطرين فوق بـ:
// const storage = multer.memoryStorage();

const upload = multer({ storage });

// === Google Sheets helpers (Service Account) ===
const {
  extractSpreadsheetIdAndGid,
  detectTabTitle,
  readSheet,
} = require("../config/googleSheets");

// ثوابت التحقق
const allowedLevelsAR = ["أساسي", "مبتدئ", "متقدم"];
const allowedLevelsEN = ["Basic", "Beginner", "Advanced"];
const DAYS = [
  { ar: "السبت", en: "Saturday" },
  { ar: "الأحد", en: "Sunday" },
  { ar: "الاثنين", en: "Monday" },
  { ar: "الثلاثاء", en: "Tuesday" },
  { ar: "الأربعاء", en: "Wednesday" },
  { ar: "الخميس", en: "Thursday" },
  { ar: "الجمعة", en: "Friday" },
];

// أدوات مساعدة
const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t); // HH:MM

function parseSchedule(raw) {
  // raw ممكن يكون string (من FormData) أو Array جاهزة
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      throw new Error("صيغة جدول التدريب غير صحيحة (JSON).");
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("يجب اختيار يوم واحد على الأقل مع تحديد الأوقات.");
  }

  // تحقق اليوم + الأوقات
  const byEn = new Set();
  const normalized = arr.map((it) => {
    const day_ar = (it.day_ar || "").trim();
    const day_en = (it.day_en || "").trim();
    const time_ar = (it.time_ar || "").trim();
    const time_en = (it.time_en || "").trim();

    // اليوم موجود بالقائمة
    const found = DAYS.find((d) => d.ar === day_ar && d.en === day_en);
    if (!found) {
      throw new Error(`اليوم غير صالح: ${day_ar} / ${day_en}`);
    }
    // بدون تكرار لنفس اليوم
    if (byEn.has(day_en)) {
      throw new Error(`يوم مكرر: ${day_en}`);
    }
    byEn.add(day_en);

    // لازم وقتين (AR/EN) بصيغة HH:MM
    if (!isValidTime(time_ar) || !isValidTime(time_en)) {
      throw new Error(`وقت غير صالح لليوم ${day_ar}. استخدم HH:MM مثل 17:30`);
    }

    return { day_ar, day_en, time_ar, time_en };
  });

  return normalized;
}

// =======================
//      GET all
// =======================
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({}).lean();
    // ما في applicantsCount نهائيًا
    res.json(courses);
  } catch (err) {
    console.error("فشل في جلب الكورسات:", err);
    res.status(500).json({ error: "فشل في جلب الكورسات" });
  }
});

// =======================
//       CREATE
// =======================
// يستقبل FormData (صورة + باقي الحقول). الحقل trainingSchedule يرسل JSON string
router.post("/", upload.single("image"), async (req, res) => {
  try {
    // دعم قيمي sheetLink / sheetLinkl (لو الواجهة القديمة ترسل الاسم الغلط)
    const normalizedSheetLink = req.body.sheetLink || req.body.sheetLinkl || "";

    const payload = {
      slug: req.body.slug,
      title_ar: req.body.title_ar,
      title_en: req.body.title_en,
      description_ar: req.body.description_ar,
      description_en: req.body.description_en,
      level_ar: req.body.level_ar,
      level_en: req.body.level_en,
      instructor_ar: req.body.instructor_ar,
      instructor_en: req.body.instructor_en,
      trainingHours_ar: req.body.trainingHours_ar,
      trainingHours_en: req.body.trainingHours_en,
      formLink: req.body.formLink,
      sheetLink: normalizedSheetLink, // ✅
    };

    // تحقق الحقول الأساسية
    const required = [
      "slug",
      "title_ar",
      "title_en",
      "description_ar",
      "description_en",
      "level_ar",
      "level_en",
      "instructor_ar",
      "instructor_en",
      "trainingHours_ar",
      "trainingHours_en",
      "formLink",
      "sheetLink",
    ];
    const missing = required.filter((k) => !payload[k]);
    if (missing.length) {
      return res
        .status(400)
        .json({ error: `حقول ناقصة: ${missing.join(", ")}` });
    }
    if (!req.file) {
      return res.status(400).json({ error: "يجب رفع صورة." });
    }

    // تحقق المستويات
    if (!allowedLevelsAR.includes(payload.level_ar)) {
      return res.status(400).json({ error: "المستوى (AR) غير صالح." });
    }
    if (!allowedLevelsEN.includes(payload.level_en)) {
      return res.status(400).json({ error: "المستوى (EN) غير صالح." });
    }

    // بارس + تحقق للجدول
    const trainingSchedule = parseSchedule(req.body.trainingSchedule);

    // رابط الصورة (Cloudinary يضع الرابط في file.path عادةً)
    const imageUrl = req.file.path;

    const newCourse = new Course({
      slug: payload.slug,
      image: imageUrl,
      title_ar: payload.title_ar,
      title_en: payload.title_en,
      description_ar: payload.description_ar,
      description_en: payload.description_en,
      level_ar: payload.level_ar,
      level_en: payload.level_en,
      instructor_ar: payload.instructor_ar,
      instructor_en: payload.instructor_en,
      trainingSchedule, // محفوظ كنص HH:MM للوقت
      trainingHours_ar: payload.trainingHours_ar,
      trainingHours_en: payload.trainingHours_en,
      formLink: payload.formLink,
      sheetLink: payload.sheetLink, // ✅
    });

    await newCourse.save();
    res
      .status(201)
      .json({ message: "✅ تم إضافة الكورس بنجاح", course: newCourse });
  } catch (err) {
    console.error("فشل في إضافة الكورس:", err.message);
    res.status(500).json({ error: err.message || "حدث خطأ أثناء حفظ الكورس" });
  }
});

// =======================
//       UPDATE
// =======================
// تعديل مع/بدون صورة. يقبل FormData أو JSON
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const body = { ...req.body };

    // لو جدول زمني وصل كسلسلة من FormData نحولو لمصفوفة
    if (typeof body.trainingSchedule === "string") {
      try {
        body.trainingSchedule = JSON.parse(body.trainingSchedule);
      } catch {
        body.trainingSchedule = [];
      }
    }

    // لو في ملف صورة جديد من المودال
    if (req.file) {
      body.image = req.file.path; // رابط Cloudinary
    }

    // تطبيع اسم حقل sheetLink (لو وصل بالاسم الخاطئ sheetLinkl)
    if (body.sheetLinkl && !body.sheetLink) {
      body.sheetLink = body.sheetLinkl;
      delete body.sheetLinkl;
    }

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ error: "الكورس غير موجود" });
    }

    res.json({ message: "تم التعديل", course: updatedCourse });
  } catch (err) {
    console.error("خطأ في التعديل:", err);
    res.status(500).json({ error: "حدث خطأ أثناء التعديل" });
  }
});

// =======================
//       DELETE
// =======================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Course.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ error: "لم يتم العثور على الكورس" });
    res.json({ message: "✅ تم حذف الكورس بنجاح" });
  } catch (err) {
    console.error("فشل في حذف الكورس:", err.message);
    res.status(500).json({ error: "حدث خطأ أثناء حذف الكورس" });
  }
});

// =======================
//  NEW: جلب المتقدمين من Google Sheet
// =======================
router.get("/:id/applicants", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ error: "الكورس غير موجود" });

    // لازم يكون مخزَّن رابط الشيت في الكورس
    const sheetLink = course.sheetLink || course.sheetLinkl; // دعم قديم
    if (!sheetLink) {
      return res.status(400).json({ error: "لا يوجد sheetLink للكورس" });
    }

    const { spreadsheetId, gid } = extractSpreadsheetIdAndGid(sheetLink);
    if (!spreadsheetId) {
      return res.status(400).json({ error: "رابط Google Sheet غير صالح" });
    }

    // اكتشاف اسم التبويب (Sheet tab)
    const tabTitle = await detectTabTitle(spreadsheetId, gid);

    // قراءة البيانات (A:Z يكفي غالبًا — عدّل المدى إذا لزم)
    const table = await readSheet(spreadsheetId, tabTitle, "A:Z");

    // رجّع headers + rows لواجهة المودال
    res.json({
      spreadsheetId,
      tabTitle,
      headers: table.headers,
      rows: table.rows,
    });
  } catch (err) {
    console.error("فشل في جلب المتقدمين:", err);
    res.status(500).json({
      error:
        "تعذر قراءة Google Sheet. تحقق من مشاركة الشيت مع Service Account والصلاحيات.",
    });
  }
});

router.get("/_debug/auth", async (req, res) => {
  try {
    const client = await _getClient();
    const token = await client.getAccessToken();
    return res.json({
      ok: !!token && typeof token === "string",
      tokenPreview: token ? String(token).slice(0, 12) + "..." : null,
      credentialsType: "GOOGLE_APPLICATION_CREDENTIALS",
    });
  } catch (e) {
    console.error("[_debug/auth] error", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
