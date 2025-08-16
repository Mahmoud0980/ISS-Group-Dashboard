const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Project = require("../models/Project");
const Vacancy = require("../models/Vacancy");
const News = require("../models/News");
const Users = require("../models/User");
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const [coursesCount, projectsCount, vacanciesCount, newsCount, userCount] =
      await Promise.all([
        Course.countDocuments(),
        Project.countDocuments(),
        Vacancy.countDocuments(),
        News.countDocuments(),
        User.countDocuments(),
      ]);

    res.json({
      coursesCount,
      projectsCount,
      vacanciesCount,
      newsCount,
      userCount,
    });
  } catch (err) {
    res.status(500).json({ error: "فشل في جلب الإحصائيات" });
  }
});

module.exports = router;
