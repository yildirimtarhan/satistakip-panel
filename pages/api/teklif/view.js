import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ HTML çıktısı (PDF’ye basılacak tasarım)
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          h1 { font-size: 20px; margin-bottom: 10px; }
          .info { margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f5f5f5; }
          .total { margin-top: 20px; font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Teklif - ${teklif.number || ""}</h1>

        <div class="info"><b>Cari:</b> ${teklif.cariUnvan || ""}</div>
        <div class="info"><b>Tarih:</b> ${new Date(teklif.createdAt).toLocaleString("tr-TR")}</div>

        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Adet</th>
              <th>Birim Fiyat</th>
              <th>Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${
              teklif.kalemler?.map((k) => `
                <tr>
                  <td>${k.urunAdi || ""}</td>
                  <td>${k.adet || 0}</td>
                  <td>${k.birimFiyat || 0} TL</td>
                  <td>${k.satirGenelToplam || 0} TL</td>
                </tr>
              `).join("") || ""
            }
          </tbody>
        </table>

        <div class="total">Genel Toplam: ${teklif.genelToplam || 0} TL</div>
      </body>
      </html>
    `;

    // ✅ Render ortamında chromium path
    const isProd = process.env.NODE_ENV === "production";

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: isProd ? await chromium.executablePath() : undefined,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Teklif-${teklif.number || id}.pdf"`);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF VIEW ERROR:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
