// routes/vacancies.js
const express = require("express");
const router = express.Router();
const { Types } = require("mongoose");
const Vacancy = require("../models/Vacancy");

// Helpers للـ Google Sheets
const {
  extractSpreadsheetIdAndGid,
  detectTabTitle,
  readSheet,
} = require("../config/googleSheets");

// =======================
//        GET ALL
// =======================
router.get("/", async (req, res) => {
  try {
    const vacancies = await Vacancy.find({}).sort({ createdAt: -1 }).lean();
    res.json(vacancies);
  } catch (err) {
    console.error("[vacancies] فشل في جلب الشواغر:", err);
    res.status(500).json({ error: "فشل في جلب الشواغر" });
  }
});

// =======================
//        CREATE
// =======================
router.post("/", async (req, res) => {
  try {
    const {
      slug,
      title_ar,
      title_en,
      description_ar,
      description_en,
      formLink,
      sheetLink, // ✅
    } = req.body;

    const required = [
      "slug",
      "title_ar",
      "title_en",
      "description_ar",
      "description_en",
      "formLink",
      "sheetLink",
    ];
    const missing = required.filter((k) => !req.body[k]);
    if (missing.length) {
      return res
        .status(400)
        .json({ error: `حقول ناقصة: ${missing.join(", ")}` });
    }

    const newVacancy = new Vacancy({
      slug,
      title_ar,
      title_en,
      description_ar,
      description_en,
      formLink,
      sheetLink,
    });

    await newVacancy.save();
    res.status(201).json(newVacancy);
  } catch (err) {
    console.error("[vacancies] فشل في إضافة الشاغر:", err);
    res.status(400).json({ error: "فشل في إضافة الشاغر" });
  }
});

// =======================
//        UPDATE
// =======================
router.put("/:id", async (req, res) => {
  try {
    const body = { ...req.body };

    // دعم اسم قديم إن وجد
    if (body.sheetLinkl && !body.sheetLink) {
      body.sheetLink = body.sheetLinkl;
      delete body.sheetLinkl;
    }

    const updated = await Vacancy.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });

    if (!updated) return res.status(404).json({ error: "الشاغر غير موجود" });

    res.json(updated);
  } catch (err) {
    console.error("[vacancies] فشل في تعديل الشاغر:", err);
    res.status(400).json({ error: "فشل في تعديل الشاغر" });
  }
});

// =======================
//        DELETE
// =======================
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Vacancy.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "الشاغر غير موجود" });
    res.json({ success: true });
  } catch (err) {
    console.error("[vacancies] فشل في حذف الشاغر:", err);
    res.status(500).json({ error: "فشل في حذف الشاغر" });
  }
});

// =======================
//   GET Applicants (id أو slug)
// =======================
router.get("/:id/applicants", async (req, res) => {
  const { id } = req.params;
  try {
    // ابحث بالـ _id أو بالـ slug
    let vacancy = Types.ObjectId.isValid(id)
      ? await Vacancy.findById(id).lean()
      : null;
    if (!vacancy) vacancy = await Vacancy.findOne({ slug: id }).lean();

    if (!vacancy) {
      return res.status(404).json({ error: "الشاغر غير موجود (id/slug)" });
    }

    const sheetLink = vacancy.sheetLink || vacancy.sheetLinkl;
    if (!sheetLink) {
      return res.status(400).json({ error: "لا يوجد sheetLink للشاغر" });
    }

    const { spreadsheetId, gid } = extractSpreadsheetIdAndGid(sheetLink);
    if (!spreadsheetId) {
      return res.status(400).json({ error: "رابط Google Sheet غير صالح" });
    }

    const tabTitle = await detectTabTitle(spreadsheetId, gid);
    const table = await readSheet(spreadsheetId, tabTitle, "A:Z");

    res.json({
      spreadsheetId,
      tabTitle,
      headers: table.headers,
      rows: table.rows,
    });
  } catch (err) {
    const status = err?.code || err?.response?.status || 500;
    const gMsg = err?.response?.data?.error?.message;
    console.error("[vacancies/applicants] error:", gMsg || err);
    if (status === 403) {
      return res.status(403).json({
        error:
          "403: لا صلاحيات للوصول إلى الشيت. شارك الشيت مع Service Account كـ Viewer.",
      });
    }
    if (status === 404) {
      return res.status(404).json({
        error: "404: لم يتم العثور على الشيت/التبويب.",
      });
    }
    return res.status(500).json({
      error:
        gMsg ||
        "تعذر قراءة Google Sheet. تحقق من المشاركة والصلاحيات و GOOGLE_APPLICATION_CREDENTIALS.",
    });
  }
});

module.exports = router;
