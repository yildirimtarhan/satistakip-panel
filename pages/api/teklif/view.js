import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import puppeteer from "puppeteer";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ HTML PDF taslağı
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { font-size: 22px; }
            .row { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 13px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Teklif - ${teklif.number || ""}</h1>

          <div class="row"><b>Cari:</b> ${teklif.cariUnvan || ""}</div>
          <div class="row"><b>Genel Toplam:</b> ${teklif.genelToplam || 0} ${teklif.paraBirimi || "TL"}</div>
          <div class="row"><b>Durum:</b> ${teklif.status || ""}</div>

          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Adet</th>
                <th>Birim Fiyat</th>
                <th>KDV</th>
                <th>Satır Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${
                (teklif.kalemler || [])
                  .map((item) => {
                    return `
                      <tr>
                        <td>${item.urunAdi || ""}</td>
                        <td>${item.adet || 0}</td>
                        <td>${item.birimFiyat || 0}</td>
                        <td>${item.kdvOrani || 0}%</td>
                        <td>${item.satirGenelToplam || 0}</td>
                      </tr>
                    `;
                  })
                  .join("")
              }
            </tbody>
          </table>

          <p style="margin-top:20px;"><b>Not:</b> ${teklif.not || ""}</p>
        </body>
      </html>
    `;

    // ✅ Render üzerinde puppeteer çalıştırma
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // ✅ PDF response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Teklif-${teklif.number || id}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("VIEW PDF ERROR:", err);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: err.message });
  }
}
