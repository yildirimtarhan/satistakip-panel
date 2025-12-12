// 📄 /pages/dashboard/efatura/index.js
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EFaturaPanel() {
  const [access, setAccess] = useState({ loading: true, allowed: false, status: "none" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAccess({ loading: false, allowed: false, status: "none" });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/efatura/access", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAccess({ loading: false, ...data });
      } catch (err) {
        console.error(err);
        setAccess({ loading: false, allowed: false, status: "error" });
      }
    })();
  }, []);

  if (access.loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  // ❌ Onay yoksa uyarı
  if (!access.allowed) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-orange-600 text-center">
          📄 E-Fatura & E-Arşiv Yönetimi
        </h1>

        <div className="bg-white p-6 rounded-xl shadow text-center space-y-3">
          <p className="text-lg font-semibold">
            E-Fatura modülünü kullanmak için başvurunuz bulunmuyor veya henüz onaylanmamış.
          </p>
          <p className="text-slate-600">
            Durum:{" "}
            <b>
              {access.status === "none" && "Başvuru yok"}
              {access.status === "pending" && "Başvuru beklemede"}
              {access.status === "rejected" && "Başvuru reddedildi"}
              {access.status === "error" && "Durum alınamadı"}
            </b>
          </p>

          <Link
            href="/dashboard/edonusum/efatura-basvuru"
            className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg"
          >
            📝 E-Fatura Başvurusu Yap
          </Link>
        </div>
      </div>
    );
  }

  // ✅ Onaylı ise mevcut panel
  return (
    <div className="p-6 space-y-6">

      {/* Başlık */}
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 E-Fatura & E-Arşiv Yönetimi
      </h1>

      {/* Üst Hızlı Menü */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <Link href="/dashboard/efatura/olustur"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border border-orange-200">
          <div className="text-3xl">➕</div>
          <div className="mt-2 font-bold">Yeni Fatura Oluştur</div>
        </Link>

        <Link href="/dashboard/efatura/gonderilenler"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border">
          <div className="text-3xl">📤</div>
          <div className="mt-2 font-bold">Gönderilen Faturalar</div>
        </Link>

        <Link href="/dashboard/efatura/taslak"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border">
          <div className="text-3xl">📝</div>
          <div className="mt-2 font-bold">Taslak Faturalar</div>
        </Link>

        <Link href="/dashboard/efatura/mukellef-sorgu"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border">
          <div className="text-3xl">🔍</div>
          <div className="mt-2 font-bold">Mükellef Sorgulama</div>
        </Link>

      </div>

      {/* Alt Alanlar – şimdilik placeholder */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">

        <h2 className="text-xl font-semibold text-slate-700">
          🧾 Son İşlemler
        </h2>

        <div className="text-slate-500 text-sm">
          Burada son oluşturulan, gönderilen veya hata veren faturalar listelenecek.
          <br />
          Entegratör API’leri geldikçe otomatik dolduracağız.
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-50">
              <tr>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Cari</th>
                <th className="px-3 py-2 text-left">Tutar</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2">–</td>
                <td className="px-3 py-2">–</td>
                <td className="px-3 py-2">–</td>
                <td className="px-3 py-2">–</td>
                <td className="px-3 py-2">–</td>
                <td className="px-3 py-2 text-orange-600">–</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
