const mongoose = require("mongoose");

const VacancySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true }, // SLUG
  title_ar: { type: String, required: true },
  title_en: { type: String, required: true },
  description_ar: String,
  description_en: String,
  formLink: String,
  sheetLink: String,
});

module.exports = mongoose.model("Vacancy", VacancySchema);
