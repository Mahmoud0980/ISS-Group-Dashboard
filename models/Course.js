const mongoose = require("mongoose");

const allowedLevelsAR = ["أساسي", "مبتدئ", "متقدم"];
const allowedLevelsEN = ["Basic", "Beginner", "Advanced"];

const CourseSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  image: String,
  title_ar: String,
  title_en: String,
  description_ar: String,
  description_en: String,
  level_ar: {
    type: String,
    enum: allowedLevelsAR,
    required: true,
  },
  level_en: {
    type: String,
    enum: allowedLevelsEN,
    required: true,
  },
  instructor_ar: String,
  instructor_en: String,
  trainingSchedule: [
    {
      day_ar: String,
      day_en: String,
      time_ar: String,
      time_en: String,
    },
  ],
  trainingHours_ar: String,
  trainingHours_en: String,
  formLink: String,
  sheetLink: String,
});

module.exports = mongoose.model("Course", CourseSchema);
