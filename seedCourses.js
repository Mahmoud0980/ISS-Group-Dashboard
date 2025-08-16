// seedCourses.js
require("dotenv").config();
const mongoose = require("mongoose");

// 🔁 نفس السكيمة التي تستخدمها في المشروع
const Course = require("./models/Course");

const courses = [
  {
    slug: "uiux-beginner",
    image: "/uiux.jpg",
    title_ar: "كورس UI/UX - المستوى الأول",
    title_en: "UI/UX Course - Beginner Level",
    description_ar:
      "مقدمة في تصميم تجربة المستخدم وواجهة الاستخدام باستخدام Figma وAdobe XD.",
    description_en: "Intro to UI/UX design using Figma and Adobe XD.",
    level_ar: "مبتدئ",
    level_en: "Beginner",
    instructor_ar: "أ. آلاء العجل",
    instructor_en: "Ms. Alaa Alajl",
    trainingDays_ar: "الأحد - الثلاثاء - الخميس",
    trainingDays_en: "Sunday - Tuesday - Thursday",
    trainingTime_ar: "5:00 - 7:00 مساءً",
    trainingTime_en: "5:00 - 7:00 PM",
    trainingHours_ar: "30 ساعة تدريبية",
    trainingHours_en: "30 training hours",
    formLink: "https://forms.gle/RDexhx1nQejoDn1aA",
  },
  {
    slug: "frontend-basics",
    image: "/frontend.jpg",
    title_ar: "كورس تطوير الواجهة الأمامية",
    title_en: "Front-End Development Course",
    description_ar:
      "تعلّم HTML وCSS وJavaScript وGit/GitHub لتطوير واجهات تفاعلية.",
    description_en:
      "Learn HTML, CSS, JavaScript, and Git/GitHub to build interactive front-ends.",
    level_ar: "أساسي",
    level_en: "Basic",
    instructor_ar: "م. رائف جودة",
    instructor_en: "Eng. Raif Gouda",
    trainingDays_ar: "السبت - الإثنين - الأربعاء",
    trainingDays_en: "Saturday - Monday - Wednesday",
    trainingTime_ar: "3:30 مساءً - 5:00 مساءً",
    trainingTime_en: "3:30 PM - 5:00 PM",
    trainingHours_ar: "48 ساعة تدريبية",
    trainingHours_en: "48 training hours",
    formLink: "https://forms.gle/Dk8cPoiY7wgCa7NUA",
  },
  {
    slug: "uiux-pro",
    image: "/uiux-pro.jpg",
    title_ar: "كورس UI/UX - مستوى متقدم",
    title_en: "UI/UX Course - Advanced Level",
    description_ar:
      "تصميم متقدم، أبحاث المستخدم، واختبارات الاستخدام لتطبيقات احترافية.",
    description_en:
      "Advanced design, user research, and usability testing for professional apps.",
    level_ar: "متقدم",
    level_en: "Advanced",
    instructor_ar: "أ. آلاء العجل",
    instructor_en: "Ms. Alaa Alajl",
    trainingDays_ar: "السبت - الإثنين - الأربعاء",
    trainingDays_en: "Saturday - Monday - Wednesday",
    trainingTime_ar: "5:15 مساءً",
    trainingTime_en: "5:15 PM",
    trainingHours_ar: "40 ساعة تدريبية",
    trainingHours_en: "40 training hours",
    formLink: "https://forms.gle/NXuqviULjXCJGhz58",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // زيد المهلة
    });
    console.log("✅ متصل بـ MongoDB");

    await Course.deleteMany(); // احذف القديم
    await Course.insertMany(courses); // أضف الجديد

    console.log("✅ تمت إضافة الدورات بنجاح");
    process.exit();
  } catch (err) {
    console.error("❌ خطأ:", err);
    process.exit(1);
  }
}

seed();
