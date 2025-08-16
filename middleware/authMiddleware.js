// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token)
      return res.status(401).json({ error: "ممنوع الدخول: لا يوجد توكن" });
    if (!process.env.JWT_SECRET)
      return res.status(500).json({ error: "خطأ في إعدادات الخادم" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // وحّد شكل المعرف
    req.user = {
      id: decoded.id || decoded._id || decoded.userId, // غطّي كل الاحتمالات
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "انتهت صلاحية التوكن" });
    return res.status(403).json({ error: "رمز مميز غير صالح" });
  }
};
