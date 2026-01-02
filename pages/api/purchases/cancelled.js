import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";
const CANCEL_MARKER = "__PURCHASE_CANCELLED__:";

function extractItemsFromNote(note) {
  if (!note || typeof note !== "string") return [];
  const idx = note.indexOf(ITEMS_MARKER);
  if (idx === -1) return [];
  try {
    return JSON.parse(note.slice(idx + ITEMS_MARKER.length).trim()) || [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await dbConnect();

    res.setHeader("Cache-Control", "no-store");

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Yetkisiz" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    // İptal ters kayıtları
    const cancels = await Transaction.find({
      userId,
      type: "purchase_cancel",
    })
      .populate("accountId", "unvan ad email")
      .sort({ date: -1 })
      .lean();

    const normalized = cancels.map((c) => {
      const items = extractItemsFromNote(c.note);
      return {
        ...c,
        items,
      };
    });

    return res.status(200).json(normalized);
  } catch (err) {
    console.error("CANCELLED PURCHASE LIST ERROR:", err);
    return res.status(500).json({ message: "İptaller getirilemedi" });
  }
}
