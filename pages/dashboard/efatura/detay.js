// 📄 /pages/dashboard/efatura/detay.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function EFaturaDetay() {
  const router = useRouter();
  const { id } = router.query;

  const [fatura, setFatura] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchFatura();
  }, [id]);

  const fetchFatura = async () => {
    try {
      const res = await fetch(`/api/efatura/detail?id=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFatura(data);
    } catch (err) {
      console.error("Fatura alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="p-6 text-center">Yükleniyor...</div>;

  if (!fatura)
    return (
      <div className="p-6 text-center text-red-600">
        Fatura bulunamadı
      </div>
    );

  const toplamKdv = fatura.items?.reduce(
    (a, b) => a + Number(b.kdvTutar || 0),
    0
  );

  const araToplam = fatura.items?.reduce(
    (a, b) => a + Number(b.tutar || 0),
    0
  );

  const genelToplam = araToplam + toplamKdv;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 E-Fatura Detay
      </h1>

      {/* ÜST ÖZET */}
      <div className="bg-white p-6 rounded-xl shadow space-y-2">
        <div className="flex justify-between text-lg font-bold">
          <div>Fatura No: {fatura.faturaNo}</div>
          <div>
            Tarih:{" "}
            {new Date(fatura.createdAt).toLocaleDateString("tr-TR")}
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Cari: {fatura.cariAd} • VKN/TCKN: {fatura.vergiNo}
        </div>

        <div className="mt-2">
          {fatura.status === "onaylandı" && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg">
              🟢 Onaylandı
            </span>
          )}

          {fatura.status === "reddedildi" && (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg">
              🔴 Reddedildi
            </span>
          )}

          {fatura.status === "beklemede" && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg">
              🟡 Gönderim Beklemede
            </span>
          )}
        </div>

        {/* PDF linki */}
        {fatura.pdfUrl && (
          <a
            href={fatura.pdfUrl}
            target="_blank"
            className="text-orange-600 text-sm underline"
          >
            📄 PDF Görüntüle
          </a>
        )}
      </div>

      {/* ÜRÜN TABLO */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2 text-left">Ürün</th>
              <th className="px-3 py-2">Adet</th>
              <th className="px-3 py-2">Birim Fiyat</th>
              <th className="px-3 py-2">KDV</th>
              <th className="px-3 py-2 text-right">Toplam</th>
            </tr>
          </thead>

          <tbody>
            {fatura.items?.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{it.ad}</td>
                <td className="px-3 py-2">{it.adet}</td>
                <td className="px-3 py-2">{it.fiyat} ₺</td>
                <td className="px-3 py-2">
                  %{it.kdvOrani} → {it.kdvTutar} ₺
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {it.tutar + it.kdvTutar} ₺
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOPLAMLAR */}
      <div className="bg-white p-6 rounded-xl shadow space-y-2 w-72 ml-auto">
        <div className="flex justify-between">
          <span>Ara Toplam</span>
          <span>{araToplam.toFixed(2)} ₺</span>
        </div>

        <div className="flex justify-between">
          <span>KDV</span>
          <span>{toplamKdv.toFixed(2)} ₺</span>
        </div>

        <div className="flex justify-between font-bold text-lg text-orange-600">
          <span>Genel Toplam</span>
          <span>{genelToplam.toFixed(2)} ₺</span>
        </div>
      </div>

      {/* İŞLEMLER */}
      <div className="flex gap-3 mt-6">
        <button className="btn-primary">🔄 Yeniden Gönder</button>
        <button className="btn-gray">📥 XML Göster</button>
        <button className="btn-gray">İptal / İtiraz</button>
      </div>

      <Link href="/dashboard/efatura/gonderilen" className="text-blue-600 underline">
        ← Gönderilen Faturalara Dön
      </Link>
    </div>
  );
}
