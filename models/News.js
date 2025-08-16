const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true }, // SLUG
  title_ar: { type: String, required: true },
  title_en: { type: String, required: true },
  summary_ar: { type: String, required: true },
  summary_en: { type: String, required: true },
  date: { type: Date, required: true },
});

module.exports = mongoose.model("News", NewsSchema);
