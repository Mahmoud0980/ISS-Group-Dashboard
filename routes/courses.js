// routes/courses.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Course = require("../models/Course");
const { _getClient } = require("../config/googleSheets");

// التخزين (Cloudinary أو بدّلها بـ memoryStorage مؤقتًا)
// const storage = multer.memoryStorage();
const storage = require("../config/cloudinaryStorage");
const upload = multer({ storage });

// Google Sheets helpers
const {
  extractSpreadsheetIdAndGid,
  detectTabTitle,
  readSheet,
} = require("../config/googleSheets");

// ثوابت
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

/* ================= أدوات وقت مرنة ================= */
const arabicDigitsMap = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
const normalizeDigits = (s) => String(s || "").replace(/[٠-٩]/g, (d) => arabicDigitsMap[d] || d);
const clean = (s) =>
  normalizeDigits(String(s || ""))
    .replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, "")
    .replace(/\s+/g, " ")
    .trim();
const pad = (n) => String(n).padStart(2, "0");

const to24 = (raw) => {
  const str0 = clean(raw);
  if (!str0) return null;
  const str = str0.toUpperCase();

  // 24h
  let m = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) return `${pad(m[1])}:${pad(m[2])}`;

  // 12h AM/PM أو ص/م
  const str2 = str.replace(/ص|AM/gi, "AM").replace(/م|PM/gi, "PM").trim();
  m = str2.match(/^([0]?\d|1[0-2]):([0-5]\d)\s?(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const mm = pad(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === "AM") { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
    return `${pad(h)}:${mm}`;
  }
  return null;
};

const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMinutes = (mins) => { const h = Math.floor(mins / 60) % 24; const m = mins % 60; return `${pad(h)}:${pad(m)}`; };
const addMinutes = (t, minutes) => {
  const total = toMinutes(t) + minutes;
  const dayDelta = Math.floor(total / 1440);
  return { time: fromMinutes((total + 1440) % 1440), dayDelta };
};
const splitRange = (val) => clean(val).split(/\s*[-–—]\s*/);

/** 🔓 مدى مرن:
 * - start-only  ➜ يحسب النهاية +120 دقيقة (بدون السماح بعبور يوم جديد)
 * - start - end ➜ يقبل أي مدة بشرط أن تكون النهاية بعد البداية وفي نفس اليوم
 */
const toRangeFlexible = (val) => {
  const v = clean(val);
  if (!v) return { ok: false, msg: "الوقت فارغ" };

  const parts = splitRange(v);
  if (parts.length === 2) {
    const a24 = to24(parts[0]);
    const b24 = to24(parts[1]);
    if (!a24 || !b24) return { ok: false, msg: "اكتب الوقت بصيغة HH:MM أو HH:MM AM/PM" };
    if (toMinutes(b24) < toMinutes(a24)) {
      return { ok: false, msg: "وقت النهاية يجب أن يكون بعد البداية في نفس اليوم" };
    }
    return { ok: true, range: `${a24} - ${b24}` };
  } else {
    const a24 = to24(v);
    if (!a24) return { ok: false, msg: "اكتب الوقت بصيغة HH:MM مثل 17:30" };
    const { time: end, dayDelta } = addMinutes(a24, 120);
    if (dayDelta !== 0) return { ok: false, msg: "لا يمكن أن يمتد الوقت لليوم التالي" };
    return { ok: true, range: `${a24} - ${end}` };
  }
};

/* =============== parser/validator للجدول =============== */
function parseSchedule(raw) {
  let arr = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); }
    catch { throw new Error("صيغة جدول التدريب غير صحيحة (JSON)."); }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("يجب اختيار يوم واحد على الأقل مع تحديد الأوقات.");
  }

  const byEn = new Set();
  const normalized = arr.map((it) => {
    const day_ar = clean(it.day_ar);
    const day_en = clean(it.day_en);
    const time_ar_raw = it.time_ar ?? "";
    const time_en_raw = it.time_en ?? it.time_ar ?? "";

    const found = DAYS.find((d) => d.ar === day_ar && d.en === day_en);
    if (!found) throw new Error(`اليوم غير صالح: ${day_ar} / ${day_en}`);

    if (byEn.has(day_en)) throw new Error(`يوم مكرر: ${day_en}`);
    byEn.add(day_en);

    // ✅ مرن
    const ar = toRangeFlexible(time_ar_raw);
    const en = toRangeFlexible(time_en_raw);
    if (!ar.ok) throw new Error(`وقت غير صالح لليوم ${day_ar}. ${ar.msg}`);
    if (!en.ok) throw new Error(`وقت (EN) غير صالح لليوم ${day_en}. ${en.msg}`);

    return { day_ar, day_en, time_ar: ar.range, time_en: en.range };
  });

  return normalized;
}

/* ======================= GET all ======================= */
router.get("/", async (_req, res) => {
  try {
    const courses = await Course.find({}).lean();
    res.json(courses);
  } catch (err) {
    console.error("فشل في جلب الكورسات:", err);
    res.status(500).json({ error: "فشل في جلب الكورسات" });
  }
});

/* ======================= CREATE ======================= */
// الصورة + formLink + sheetLink اختياريّة
router.post("/", upload.single("image"), async (req, res) => {
  try {
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
      formLink: req.body.formLink || "",    // اختياري
      sheetLink: normalizedSheetLink || "", // اختياري
    };

    // الحقول الإلزامية (بدون الصورة/الروابط)
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
    ];
    const missing = required.filter((k) => !payload[k]);
    if (missing.length) {
      return res.status(400).json({ error: `حقول ناقصة: ${missing.join(", ")}` });
    }

    // تحقق المستويات
    if (!allowedLevelsAR.includes(payload.level_ar)) {
      return res.status(400).json({ error: "المستوى (AR) غير صالح." });
    }
    if (!allowedLevelsEN.includes(payload.level_en)) {
      return res.status(400).json({ error: "المستوى (EN) غير صالح." });
    }

    // الجدول الزمني (مطلوب)
    const trainingSchedule = parseSchedule(req.body.trainingSchedule);

    // الصورة اختياريّة
    const imageUrl = req.file ? req.file.path : (req.body.image || "");

    const newCourse = new Course({
      slug: payload.slug,
      image: imageUrl || "",
      title_ar: payload.title_ar,
      title_en: payload.title_en,
      description_ar: payload.description_ar,
      description_en: payload.description_en,
      level_ar: payload.level_ar,
      level_en: payload.level_en,
      instructor_ar: payload.instructor_ar,
      instructor_en: payload.instructor_en,
      trainingSchedule, // "HH:MM - HH:MM"
      trainingHours_ar: payload.trainingHours_ar,
      trainingHours_en: payload.trainingHours_en,
      formLink: payload.formLink || "",
      sheetLink: payload.sheetLink || "",
    });

    await newCourse.save();
    res.status(201).json({ message: "✅ تم إضافة الكورس بنجاح", course: newCourse });
  } catch (err) {
    console.error("فشل في إضافة الكورس:", err.message);
    res.status(500).json({ error: err.message || "حدث خطأ أثناء حفظ الكورس" });
  }
});

/* ======================= UPDATE ======================= */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const body = { ...req.body };

    if (typeof body.trainingSchedule === "string") {
      try { body.trainingSchedule = JSON.parse(body.trainingSchedule); }
      catch { body.trainingSchedule = []; }
    }

    if (Array.isArray(body.trainingSchedule) && body.trainingSchedule.length) {
      body.trainingSchedule = parseSchedule(body.trainingSchedule);
    }

    // صورة اختيارية
    if (req.file) body.image = req.file.path;

    // sheetLinkl → sheetLink
    if (body.sheetLinkl && !body.sheetLink) {
      body.sheetLink = body.sheetLinkl;
      delete body.sheetLinkl;
    }

    // الروابط لو undefined خليها ""
    if (body.formLink === undefined) body.formLink = "";
    if (body.sheetLink === undefined) body.sheetLink = "";

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updatedCourse) return res.status(404).json({ error: "الكورس غير موجود" });

    res.json({ message: "تم التعديل", course: updatedCourse });
  } catch (err) {
    console.error("خطأ في التعديل:", err);
    res.status(500).json({ error: err.message || "حدث خطأ أثناء التعديل" });
  }
});

/* ======================= DELETE ======================= */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Course.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "لم يتم العثور على الكورس" });
    res.json({ message: "✅ تم حذف الكورس بنجاح" });
  } catch (err) {
    console.error("فشل في حذف الكورس:", err.message);
    res.status(500).json({ error: "حدث خطأ أثناء حذف الكورس" });
  }
});

/* ========== جلب المتقدمين من Google Sheet ========== */
// يقبل ID أو slug — ولو ما في sheetLink يرجّع بيانات فاضية بدون خطأ
router.get("/:id/applicants", async (req, res) => {
  try {
    const param = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
    const course = isObjectId
      ? await Course.findById(param).lean()
      : await Course.findOne({ slug: param }).lean();

    if (!course) return res.status(404).json({ error: "الكورس غير موجود" });

    const sheetLink = course.sheetLink || course.sheetLinkl; // اختياري
    if (!sheetLink) {
      return res.json({ spreadsheetId: null, tabTitle: "", headers: [], rows: [] });
    }

    const { spreadsheetId, gid } = extractSpreadsheetIdAndGid(sheetLink);
    if (!spreadsheetId) {
      return res.json({ spreadsheetId: null, tabTitle: "", headers: [], rows: [] });
    }

    const tabTitle = await detectTabTitle(spreadsheetId, gid);
    const table = await readSheet(spreadsheetId, tabTitle, "A:Z");

    res.json({ spreadsheetId, tabTitle, headers: table.headers, rows: table.rows });
  } catch (err) {
    console.error("فشل في جلب المتقدمين:", err);
    res.status(500).json({
      error: "تعذر قراءة Google Sheet. تحقق من مشاركة الشيت مع Service Account والصلاحيات.",
    });
  }
});

router.get("/_debug/auth", async (_req, res) => {
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
