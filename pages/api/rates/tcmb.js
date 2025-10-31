import axios from "axios";
import { parseStringPromise } from "xml2js";

export default async function handler(req, res) {
  try {
    const url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    const xml = await axios.get(url);
    const result = await parseStringPromise(xml.data);

    const usd = result.Tarih_Date.Currency.find(c => c.$.Kod === "USD");
    const eur = result.Tarih_Date.Currency.find(c => c.$.Kod === "EUR");

    const rates = {
      USD: parseFloat(usd.ForexSelling[0]),
      EUR: parseFloat(eur.ForexSelling[0]),
    };

    return res.status(200).json({ success: true, rates });
  } catch (err) {
    console.error("TCMB fetch error:", err);
    return res
      .status(500)
      .json({ success: false, message: "TCMB verisi okunamadı" });
  }
}
