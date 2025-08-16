// utils/sheets.js
const { google } = require("googleapis");
const path = require("path");

async function getApplicantsCount(
  spreadsheetId,
  rangeA1 = "Form_Responses!A2:A"
) {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../credentials/gsheets.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeA1, // عدّل الاسم حسب تبويب الشيت عندك
  });

  // إن كان عندك صف عنوان، نبدأ من A2 كما فعلنا، فعدد القيم = عدد المتقدّمين
  const values = res.data.values || [];
  return values.length;
}

module.exports = { getApplicantsCount };
