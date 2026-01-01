import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  await dbConnect();

  const token = req.headers.authorization?.split(" ")[1];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ message: "Yetkisiz" });
  }

  const { accountId } = req.query;

  if (!accountId) {
    return res.status(400).json({ message: "accountId gerekli" });
  }

  const rows = await Transaction.find({
    companyId: user.companyId,
    accountId,
  });

  let borc = 0;
  let alacak = 0;

  rows.forEach((t) => {
    if (t.direction === "borc") borc += t.amount;
    if (t.direction === "alacak") alacak += t.amount;
  });

  res.json({
    borc,
    alacak,
    bakiye: borc - alacak,
  });
}
