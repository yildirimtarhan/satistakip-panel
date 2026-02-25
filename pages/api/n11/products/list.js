import jwt from "jsonwebtoken";
import { n11ListProducts } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const page = Number(req.query.page || 0);
    const size = Number(req.query.size || 50);

    const result = await n11ListProducts({ companyId, userId, page, size });

    return res.status(200).json(result);
  } catch (err) {
    console.error("N11 LIST ERROR:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err?.response?.data?.message || err.message,
    });
  }
}
