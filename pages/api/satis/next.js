import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const client = await clientPromise;
    const db = client.db();

    const year = new Date().getFullYear();

    // Bu kullanıcıya ait en son saleNo
    const lastSale = await db
      .collection("transactions")
      .find({ userId, type: "sale", saleNo: { $exists: true } })
      .sort({ saleNo: -1 })
      .limit(1)
      .toArray();

    let nextCounter = 1;

    if (lastSale.length) {
      const last = lastSale[0].saleNo;
      const parts = last.split("-");
      const lastYear = Number(parts[1]);
      const lastNum = Number(parts[2]);

      nextCounter = year > lastYear ? 1 : lastNum + 1;
    }

    const saleNo = `S-${year}-${String(nextCounter).padStart(4, "0")}`;

    return res.status(200).json({ saleNo });
  } catch (err) {
    console.error("❌ Sale next number error:", err);
    return res.status(500).json({ message: "Internal error" });
  }
}
