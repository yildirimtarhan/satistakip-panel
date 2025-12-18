import axios from "axios";
import { parseStringPromise } from "xml2js";

/**
 * TCMB Kur Servisi
 * GET /api/rates/tcmb?date=YYYY-MM-DD (opsiyonel)
 *
 * Response:
 * {
 *   date: "2025-12-15",
 *   USD: { rateSell: 34.1234 },
 *   EUR: { rateSell: 37.5678 }
 * }
 */
export default async function handler(req, res) {
  try {
    const qDate = String(req.query.date || "").slice(0, 10);

    let url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    let isoDate = new Date().toISOString().slice(0, 10);

    // Geçmiş tarih istenirse
    if (qDate) {
      const [yyyy, mm, dd] = qDate.split("-");
      const yyyymm = `${yyyy}${mm}`;
      const ddmmyyyy = `${dd}${mm}${yyyy}`;
      url = `https://www.tcmb.gov.tr/kurlar/${yyyymm}/${ddmmyyyy}.xml`;
      isoDate = qDate;
    }

    const xml = await axios.get(url);
    const parsed = await parseStringPromise(xml.data, { explicitArray: false });

    const list = parsed?.Tarih_Date?.Currency;
    const arr = Array.isArray(list) ? list : [list].filter(Boolean);

    const pick = (code) => arr.find((c) => c?.$?.Kod === code);

    const usd = pick("USD");
    const eur = pick("EUR");

    const toNum = (v) => {
      const s = String(v || "").replace(",", ".").trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const USD = usd ? { rateSell: toNum(usd.ForexSelling) } : null;
    const EUR = eur ? { rateSell: toNum(eur.ForexSelling) } : null;

    return res.status(200).json({
      date: isoDate,
      USD,
      EUR,
    });
  } catch (err) {
    console.error("TCMB fetch error:", err);
    return res.status(500).json({
      message: "TCMB verisi okunamadı",
      error: err.message,
    });
  }
}
