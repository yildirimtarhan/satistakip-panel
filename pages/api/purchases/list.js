import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import jwt from "jsonwebtoken";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";
const CANCEL_MARKER = "__PURCHASE_CANCELLED__:";

function extractItemsFromNote(note) {
  if (!note || typeof note !== "string") return null;
  const idx = note.indexOf(ITEMS_MARKER);
  if (idx === -1) return null;
  const json = note.slice(idx + ITEMS_MARKER.length).trim();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractHumanNote(note) {
  if (!note || typeof note !== "string") return "";
  const idx = note.indexOf(ITEMS_MARKER);
  return idx === -1 ? note.trim() : note.slice(0, idx).trim();
}

function isCancelled(note) {
  return typeof note === "string" && note.includes(CANCEL_MARKER);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Yetkisiz" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    const filter = { userId, type: "purchase" };
    if (companyId && ("companyId" in (Transaction.schema?.paths || {}))) {
      filter.companyId = companyId;
    }

    const purchases = await Transaction.find(filter)
      .populate("accountId", "unvan ad firmaAdi email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // ✅ iptal edilenleri gizle + normalize et
    const normalized = purchases
      .filter((p) => !isCancelled(p.note))
      .map((p) => {
        const noteItems = extractItemsFromNote(p.note);
        const legacySingle = p.productId
          ? [
              {
                productId: p.productId,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                total: p.total || p.totalTRY || p.amount || 0,
              },
            ]
          : null;

        const items = Array.isArray(p.items)
          ? p.items
          : noteItems
          ? noteItems
          : legacySingle
          ? legacySingle
          : [];

        return {
          ...p,
          items,
          description: extractHumanNote(p.note) || "Alış",
        };
      });

    return res.status(200).json(normalized);
  } catch (err) {
    console.error("PURCHASE LIST ERROR:", err);
    return res.status(500).json({ message: "Alışlar getirilemedi", error: err.message });
  }
}
