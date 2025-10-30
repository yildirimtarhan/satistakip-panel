import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import XLSX from "xlsx";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const buffer = await new Promise((resolve, reject) => {
      let chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const formatted = rows.map((r) => ({
      ad: r.ad,
      kategori: r.kategori || "",
      barkod: r.barkod || "",
      sku: r.sku || "",
      birim: r.birim || "Adet",
      alisFiyati: Number(r.alisFiyati) || 0,
      satisFiyati: Number(r.satisFiyati) || 0,
      stok: Number(r.stok) || 0,
      paraBirimi: r.paraBirimi || "TRY",
      kdvOrani: Number(r.kdvOrani) || 20,
      userId: decoded.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const client = await clientPromise;
    const db = client.db("satistakip");
    await db.collection("products").insertMany(formatted);

    res.json({ success: true, count: formatted.length });
  } catch (err) {
    res.status(500).json({ message: "Import error", error: err.message });
  }
}
