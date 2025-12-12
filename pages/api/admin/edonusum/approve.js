import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).end();

  try {
    await dbConnect();

    // 🔐 Admin token
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    const { id } = req.body;

    const db = (await dbConnect()).connection.db;
    const col = db.collection("edonusum_applications");

    const app = await col.findOne({ _id: id });
    if (!app) {
      return res.status(404).json({ message: "Başvuru bulunamadı" });
    }

    // ✅ Taxten API – müşteri oluşturma
    const taxtenRes = await axios.post(
      `${process.env.TAXTEN_BASE_URL}/clients`,
      {
        vknTckn: app.vknTckn,
        title: app.companyTitle,
        email: app.contactEmail,
        phone: app.contactPhone,
      },
      {
        headers: {
          "X-Client-Id": process.env.TAXTEN_TEST_CLIENT_ID,
          "X-Api-Key": process.env.TAXTEN_TEST_API_KEY,
        },
      }
    );

    // 📌 DB güncelle
    await col.updateOne(
      { _id: id },
      {
        $set: {
          status: "approved",
          taxtenClientId: taxtenRes.data.clientId,
          approvedAt: new Date(),
        },
      }
    );

    // 📧 Mail (bir sonraki adımda detaylandıracağız)
    // sendMail(app.contactEmail, "...")

    return res.json({
      success: true,
      message: "Başvuru onaylandı ve Taxten hesabı oluşturuldu",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
