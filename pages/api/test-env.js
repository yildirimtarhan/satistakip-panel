export default function handler(req, res) {
  res.status(200).json({
    TRENDYOL_SUPPLIER_ID: process.env.TRENDYOL_SUPPLIER_ID || "YOK",
    TRENDYOL_API_KEY: process.env.TRENDYOL_API_KEY ? "VAR" : "YOK",
    TRENDYOL_API_SECRET: process.env.TRENDYOL_API_SECRET ? "VAR" : "YOK",
    TRENDYOL_BASE_URL: process.env.TRENDYOL_BASE_URL || "YOK",
    TRENDYOL_USER_AGENT: process.env.TRENDYOL_USER_AGENT || "YOK",
  });
}
