const mongoose = require("mongoose");

const STATUS = ["قريبا", "منجز", "قيد التحديث"];

const ProjectSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true }, // SLUG

  title_ar: { type: String, required: true },
  title_en: { type: String, required: true },

  description_ar: { type: String, required: true },
  description_en: { type: String, required: true },

  company: { type: String, required: true }, // الشركة الهادفة
  startDate: { type: Date, required: true }, // تاريخ البدء
  status: { type: String, enum: STATUS, required: true }, // الحالة

  image: { type: String, default: "" }, // URL من Cloudinary
  link: { type: String, default: "" },
});

module.exports = mongoose.model("Project", ProjectSchema);
module.exports.STATUS = STATUS;
