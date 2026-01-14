import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import { verifyToken } from "@/utils/auth";
import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderIadeMakbuzuPdf } from "@/lib/pdf/templates/iadeMakbuzu";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
const headerToken = auth.replace("Bearer ", "");
const queryToken = req.query.token || "";
const token = headerToken || queryToken;

    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { returnSaleNo } = req.query;
    if (!returnSaleNo) {
      return res.status(400).json({ message: "returnSaleNo gerekli" });
    }

    // 🔁 İade işlemi
    const saleReturn = await Transaction.findOne({
      saleNo: returnSaleNo,
      type: "sale_return",
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    });

    if (!saleReturn) {
      return res.status(404).json({ message: "İade bulunamadı" });
    }

    const cari = await Cari.findById(saleReturn.accountId);

    // 💸 varsa iade ödemesi / mahsup
    const refund = await Transaction.findOne({
      refSaleNo: returnSaleNo,
      type: "payment",
      direction: "borc",
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    });

    const doc = createPdf(res, {
      title: "İade Makbuzu",
      fileName: `IADE-${returnSaleNo}.pdf`,
    });

    renderIadeMakbuzuPdf(doc, {
      company: user.company || {},
      cari: cari?.unvan || "-",
      date: saleReturn.createdAt.toLocaleDateString("tr-TR"),
      returnSaleNo,
      refSaleNo: saleReturn.refSaleNo,
      items: saleReturn.items,
      total: saleReturn.total,
      refund: refund
        ? {
            amount: refund.total,
            method: refund.paymentMethod || "Nakit",
          }
        : null,
    });

    doc.end();
  } catch (err) {
    console.error("RETURN PDF ERROR:", err);
    return res.status(500).json({ message: "İade PDF oluşturulamadı" });
  }
}
