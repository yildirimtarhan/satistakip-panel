// 📁 /pages/api/edonusum/admin/approve.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST destekleniyor" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
    } catch (err) {
      return res.status(401).json({ message: "Token hatalı" });
    }

    // Başvuru ID
    const { applicationId } = req.body;

    const client = await dbConnect();
    const db = client.connection.db;

    const col = db.collection("edonusum_applications");
    const companyCol = db.collection("company_settings");

    // 1) Başvuru kaydını bul
    const app = await col.findOne({ _id: applicationId });
    if (!app)
      return res.status(404).json({ message: "Başvuru bulunamadı" });

    // 2) Firma bilgisi
    const company = await companyCol.findOne({ userId: app.userId });
    if (!company)
      return res.status(404).json({ message: "Firma bulunamadı" });

    // 3) TAxten API ile hesap oluştur
    const taxtenRes = await fetch(
      `${process.env.TAXTEN_BASE_URL}/accounts/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.TAXTEN_TEST_CLIENT_ID,
          "x-api-key": process.env.TAXTEN_TEST_API_KEY,
        },
        body: JSON.stringify({
          title: company.companyTitle,
          vkn: company.vknTckn,
          email: company.email,
          phone: company.phone,
          address: company.address,
        }),
      }
    );

    const taxtenData = await taxtenRes.json();

    if (!taxtenRes.ok || !taxtenData.success) {
      console.log("Taxten API Hatası:", taxtenData);
      return res.status(500).json({ message: "Taxten API hatası" });
    }

    const { clientId, apiKey } = taxtenData.data;

    // 4) ERP’ye kaydet
    await companyCol.updateOne(
      { userId: app.userId },
      {
        $set: {
          efatura: {
            taxtenClientId: clientId,
            taxtenApiKey: apiKey,
            accountStatus: "active",
          },
        },
      }
    );

    // 5) Başvuruyu güncelle
    await col.updateOne(
      { _id: applicationId },
      { $set: { status: "approved", approvedAt: new Date() } }
    );

    // 6) Kullanıcıya mail gönder
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SYSTEM_MAIL,
        pass: process.env.SYSTEM_MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SYSTEM_MAIL,
      to: company.email,
      subject: "E-Dönüşüm Hesabınız Onaylandı",
      text: `
Merhaba,

E-Fatura / E-Arşiv başvurunuz onaylanmış ve Taxten üzerinde hesabınız oluşturulmuştur.

API Bilgileriniz:
ClientID: ${clientId}
API Key: ${apiKey}

Artık e-fatura test kesimi yapabilirsiniz.

Saygılarımızla,
SatışTakip ERP
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Başvuru onaylandı ve Taxten hesabı oluşturuldu",
      taxten: taxtenData.data,
    });
  } catch (err) {
    console.error("Onay API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
