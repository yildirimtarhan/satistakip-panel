import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });

  const db = (await clientPromise).db();

  const match =
    decoded.role === "admin"
      ? { type: "sale", isDeleted: { $ne: true } }
      : {
          type: "sale",
          userId: decoded.userId,
          isDeleted: { $ne: true },
        };

  const sales = await db
    .collection("transactions")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: "$saleNo",
          saleNo: { $first: "$saleNo" },
          date: { $first: "$date" },
          accountId: { $first: "$accountId" },
          currency: { $first: "$currency" },
          totalTRY: { $sum: "$totalTRY" },
        },
      },
      { $sort: { date: -1 } },
    ])
    .toArray();

  res.json(sales);
}
