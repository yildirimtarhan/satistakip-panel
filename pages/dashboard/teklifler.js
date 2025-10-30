// pages/dashboard/teklifler.js
export default function Teklifler() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📄 Fiyat Teklifleri</h1>
      <p className="text-slate-600">
        Burada teklif oluşturabilir, PDF’e dönüştürebilir ve müşteriye e-posta ile gönderebilirsiniz.
      </p>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-slate-500">Yakında: Yeni Teklif • Teklif Listesi • Durum (Taslak / Gönderildi / Onaylandı)</div>
      </div>
    </div>
  );
}
