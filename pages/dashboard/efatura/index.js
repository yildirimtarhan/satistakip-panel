// 📄 /pages/dashboard/efatura/index.js
import Link from "next/link";

export default function EFaturaPanel() {
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

      {/* Alt Alanlar */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">

        <h2 className="text-xl font-semibold text-slate-700">
          🧾 Son İşlemler
        </h2>

        <div className="text-slate-500 text-sm">
          Burada son oluşturulan, gönderilen veya hata veren faturalar listelenecek.
          <br />
          Entegratör API’leri geldiğinde otomatik dolduracağız.
        </div>

        {/* Placeholder tablo */}
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
