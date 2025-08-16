const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const app = express();

const PORT = 5000;

// خلي بيانات الـ OAuth client عندك هنا:
const CLIENT_ID =
  "742593247199-46of849qbp14hnhpbhni5qqve7ivpkqg.apps.googleusercontent.com";
const CLIENT_SECRET = "GOCSPX-48guN0vprI_9vCRs1SQ1CbKkA";
const REDIRECT_URI = "http://localhost:5000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ["https://www.googleapis.com/auth/drive.file"];

// الخطوة 1: رابط تسجيل الدخول - تعرضه للمستخدم
app.get("/", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // عشان تحصل على refresh_token
    scope: scopes,
  });
  res.send(
    `<h1>تسجيل دخول جوجل</h1><p>اضغط <a href="${authUrl}">هنا</a> للسماح للتطبيق بالوصول إلى Google Drive.</p>`
  );
});

// الخطوة 2: استقبال الرد من جوجل مع الكود وتبادل الكود بالتوكن
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("لم يتم استقبال كود التفويض.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // حفظ التوكن في ملف
    fs.writeFileSync("oauth_token.json", JSON.stringify(tokens));
    res.send(
      "✅ تم الحصول على التوكن وحفظه بنجاح. يمكنك الآن إغلاق هذه الصفحة."
    );

    console.log("تم حفظ التوكن في oauth_token.json");
  } catch (error) {
    console.error("حدث خطأ أثناء الحصول على التوكن:", error.message);
    res.status(500).send("❌ خطأ في تبادل الكود بالتوكن.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 افتح http://localhost:${PORT} في متصفحك`);
});
