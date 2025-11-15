// 📄 /pages/api/efatura/drafts.js
// MOCK TASLAK FATURA API – GEÇİCİDİR
// Gerçek entegratör API geldiğinde bu dosyayı değiştireceğiz.

let mockDrafts = [
  {
    id: "DRAFT-001",
    date: "2025-01-01",
    cari: "Örnek Müşteri A.Ş.",
    total: 1250.5,
    status: "Taslak"
  }
];

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(mockDrafts);
  }

  if (req.method === "POST") {
    const newDraft = {
      id: "DRAFT-" + String(mockDrafts.length + 1).padStart(3, "0"),
      date: new Date().toISOString().split("T")[0],
      cari: req.body.cari || "Bilinmiyor",
      total: req.body.total || 0,
      status: "Taslak"
    };

    mockDrafts.push(newDraft);
    return res.status(201).json({ message: "Taslak oluşturuldu", draft: newDraft });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
