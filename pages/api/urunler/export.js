import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import XLSX from "xlsx";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");

    const data = await db
      .collection("products")
      .find({ userId: decoded.userId })
      .project({ _id: 0 })
      .toArray();

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="urunler.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: "Export error", error: err.message });
  }
}
