// config/googleSheets.js
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

function assertCreds() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error(
      "[googleSheets] Missing GOOGLE_APPLICATION_CREDENTIALS in .env"
    );
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is required and must point to your service account JSON file."
    );
  }
  const abs = path.resolve(keyPath);
  if (!fs.existsSync(abs)) {
    console.error(
      "[googleSheets] File not found at GOOGLE_APPLICATION_CREDENTIALS:",
      abs
    );
    throw new Error(
      "Service account JSON file not found. Check GOOGLE_APPLICATION_CREDENTIALS path."
    );
  }
  return abs;
}

let _parsedKeyJson = null;
function readKeyJson() {
  if (_parsedKeyJson) return _parsedKeyJson;
  const abs = assertCreds();
  const raw = fs.readFileSync(abs, "utf8");
  const json = JSON.parse(raw);
  if (json.type !== "service_account") {
    throw new Error("Credentials JSON is not a service_account type.");
  }
  // طباعة معلومات تشخيصية آمنة
  console.log(
    "[googleSheets] Using SA:",
    json.client_email,
    "key_id:",
    json.private_key_id ? json.private_key_id.slice(0, 8) + "…" : "N/A"
  );
  _parsedKeyJson = json;
  return json;
}

let _clientPromise = null;
let _sheets = null;

async function getClient() {
  if (_clientPromise) return _clientPromise;

  const keyJson = readKeyJson();
  const keyFile = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
  });

  _clientPromise = auth.getClient().then((client) => {
    _sheets = google.sheets({ version: "v4", auth: client });
    return client;
  });

  return _clientPromise;
}

async function getSheets() {
  if (!_sheets) await getClient();
  return _sheets;
}

function extractSpreadsheetIdAndGid(url) {
  if (!url) return {};
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[?&]gid=(\d+)/);
  return {
    spreadsheetId: idMatch ? idMatch[1] : null,
    gid: gidMatch ? parseInt(gidMatch[1], 10) : null,
  };
}

async function detectTabTitle(spreadsheetId, gid) {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const all = meta.data.sheets || [];
  if (gid != null) {
    const byGid = all.find((s) => s.properties?.sheetId === gid);
    if (byGid) return byGid.properties.title;
  }
  const guess = all.find((s) => /Form Responses/i.test(s.properties?.title));
  if (guess) return guess.properties.title;
  return all[0]?.properties?.title || "Form Responses 1";
}

function valuesToTable(values = []) {
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0];
  const rows = values.slice(1);
  return { headers, rows };
}

async function readSheet(spreadsheetId, tabTitle, rangeA1 = "A:Z") {
  const sheets = await getSheets();
  const range = `'${tabTitle}'!${rangeA1}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: "ROWS",
  });
  const values = res.data.values || [];
  return valuesToTable(values);
}

// Debug helpers
async function _getClient() {
  return getClient();
}
function _getParsedKeyJson() {
  return readKeyJson();
}

module.exports = {
  extractSpreadsheetIdAndGid,
  detectTabTitle,
  readSheet,
  _getClient,
  _getParsedKeyJson,
};
