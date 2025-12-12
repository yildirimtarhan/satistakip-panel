// 📁 /pages/api/edonusum/basvuru-update.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
    }

  try {
    await dbConnect();

    // Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // Admin değilse reddet
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin yetkisi gerekli" });
    }

    const { appId, status, adminNote } = req.body;

    if (!appId || !status) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    // Başvuru bilgilerini getir
    const application = await col.findOne({ _id: appId });

    if (!application) {
      return res.status(404).json({ message: "Başvuru bulunamadı" });
    }

    // Eğer admin “Onaylandı” diyorsa → Taxten hesabı oluştur
    let taxtenCustomerId = null;

    if (status === "approved") {
      try {
        const response = await axios.post(
          `${process.env.TAXTEN_BASE_URL}/account/create`,
          {
            clientId: process.env.TAXTEN_TEST_CLIENT_ID,
            vkn: application.vkn || "",
            title: application.companyTitle || "",
            email: application.contactEmail,
            phone: application.contactPhone,
            address: application.address || "",
            modules: Object.keys(application.modules).filter((m) => application.modules[m]),
          },
          {
            headers: {
              "Content-Type": "application/json",
              apiKey: process.env.TAXTEN_TEST_API_KEY,
            },
          }
        );

        if (response.data?.success) {
          taxtenCustomerId = response.data.data.customerId; 
        } else {
          console.log("Taxten hata:", response.data);
          return res.status(500).json({ 
            message: "Taxten hesabı oluşturulamadı",
            detail: response.data 
          });
        }

      } catch (err) {
        console.error("Taxten API Error:", err.response?.data || err);
        return res.status(500).json({ 
          message: "Taxten API hatası", 
          detail: err.response?.data 
        });
      }
    }

    // Başvuru kaydını güncelle
    await col.updateOne(
      { _id: appId },
      {
        $set: {
          status,
          adminNote: adminNote || "",
          taxtenCustomerId: taxtenCustomerId || null,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Başvuru güncellendi",
      taxtenCustomerId,
    });

  } catch (err) {
    console.error("Başvuru Update API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
