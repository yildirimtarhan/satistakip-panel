import dbConnect from "@/lib/dbConnect";
import CompanySettings from "@/models/CompanySettings";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token yok" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const company = await CompanySettings.findOne({ userId });

    if (!company) {
      return res.status(404).json({ message: "Firma bulunamadı" });
    }

    return res.status(200).json({
      companyId: company._id,
      company,
    });
  } catch (err) {
    return res.status(500).json({ message: "Hata", error: err.message });
  }
}
