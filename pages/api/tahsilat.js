import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const transactions = db.collection("transactions");
    const accounts = db.collection("accounts");

    if (req.method === "POST") {
      const { accountId, type, amount, note } = req.body;

      if (!accountId || !amount)
        return res.status(400).json({ message: "Cari ve tutar zorunlu" });

      const accountObj = new ObjectId(accountId);
      const val = Number(amount);

      // ✅ Tahsilat ➜ carinin borcu azalır
      // ✅ Ödeme ➜ carinin borcu artar
      const balanceChange = type === "tahsilat" ? -val : val;

      // Kaydı işlemler tablosuna ekle
      await transactions.insertOne({
        accountId: accountObj,
        type,
        amount: val,
        note: note || "",
        currency: "TRY",
        date: new Date(),
        isFinance: true, // 🔐 stoktan bağımsız finansal işlem işareti
      });

      // Cari bakiyeyi güncelle
      await accounts.updateOne(
        { _id: accountObj },
        { $inc: { balance: balanceChange } }
      );

      return res.json({ message: "✅ Tahsilat işlemi kaydedildi" });
    }

    if (req.method === "GET") {
      const list = await transactions
        .aggregate([
          { $match: { isFinance: true } },
          {
            $lookup: {
              from: "accounts",
              localField: "accountId",
              foreignField: "_id",
              as: "cari",
            }
          },
          { $sort: { date: -1 } }
        ])
        .toArray();

      return res.json(
        list.map(t => ({
          cari: t.cari?.[0]?.ad || "—",
          type: t.type,
          amount: t.amount,
          note: t.note,
          date: t.date
        }))
      );
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("Tahsilat API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
