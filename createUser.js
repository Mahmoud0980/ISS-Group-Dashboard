// scripts/createUser.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ تم الاتصال بقاعدة البيانات");

    const username = "MahmoudHaj";
    const email = "Mahmoud@iss.com";
    const password = "m123";
    const role = "user";

    const existing = await User.findOne({ username });
    if (existing) {
      console.log("⚠️ المستخدم موجود بالفعل");
      return process.exit();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      allowedSections:
        role === "admin"
          ? ["courses", "news", "projects", "vacancies", "users", "statistics"]
          : ["courses", "news", "projects"],
    });

    console.log("✅ تم إنشاء المستخدم بنجاح:", user.username);
  } catch (err) {
    console.error("❌ فشل في إنشاء المستخدم:", err);
  } finally {
    process.exit();
  }
}

createUser();
