import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import { verifyToken } from "@/utils/auth";
import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderIptalFisPdf } from "@/lib/pdf/templates/iptalFis";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 AUTH
    const auth = req.headers.authorization || "";
const headerToken = auth.replace("Bearer ", "");
const queryToken = req.query.token || "";
const token = headerToken || queryToken;

    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo gerekli" });
    }

    // ✅ İptal hareketi bul
    const cancelTx = await Transaction.findOne({
      refSaleNo: saleNo,
      type: "sale_cancel",
      ...(user.companyId ? { companyId: user.companyId } : { userId: user.userId }),
    });

    if (!cancelTx) {
      return res.status(404).json({ message: "İptal kaydı bulunamadı" });
    }

    const cari = cancelTx.accountId ? await Cari.findById(cancelTx.accountId) : null;

    const doc = createPdf(res, {
      title: "Satış İptal Fişi",
      fileName: `IPTAL-${saleNo}.pdf`,
    });

    renderIptalFisPdf(doc, {
      company: user.company || {},
      cari: cari?.unvan || cancelTx.accountName || "-",
      date: new Date(cancelTx.date || cancelTx.createdAt).toLocaleDateString("tr-TR"),
      saleNo,
      amount: cancelTx.totalTRY || cancelTx.amount || 0,
      note: cancelTx.note || "",
    });

    doc.end();
  } catch (err) {
    console.error("CANCEL PDF ERROR:", err);
    return res.status(500).json({ message: "İptal PDF oluşturulamadı" });
  }
}
