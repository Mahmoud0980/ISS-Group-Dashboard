const { google } = require("googleapis");
const { Readable } = require("stream");
const path = require("path");
const fs = require("fs");

// تحميل بيانات حساب الخدمة
const serviceAccount = require("../config/service_account_key.json"); // أو غير المسار إذا مختلف

// إعداد Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

// إنشاء عميل Google Drive
const drive = google.drive({ version: "v3", auth });

async function uploadFileToDrive(fileBuffer, fileName, folderId) {
  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null);

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "image/jpeg",
      body: bufferStream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });

    const fileId = file.data.id;

    // جعل الصورة قابلة للمشاركة عبر الرابط
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const imageUrl = `https://drive.google.com/uc?id=${fileId}`;
    return imageUrl;
  } catch (err) {
    console.error("❌ رفع الصورة فشل:", err.message);
    throw err;
  }
}

module.exports = { uploadFileToDrive };
