import clientPromise from "@/lib/mongodb";
export default async function handler(req, res) {
  const { id } = req.query;
  const client = await clientPromise;
  const db = client.db("satistakip");

  const transactions = await db.collection("transactions").find({ accountId: id }).toArray();

  let borc = 0, alacak = 0;
  transactions.forEach(t => {
    if (t.type === "purchase") borc += t.totalTRY;
    if (t.type === "sale") alacak += t.totalTRY;
  });

  res.json({ borc, alacak, bakiye: alacak - borc });
}
