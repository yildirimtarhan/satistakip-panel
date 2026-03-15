// 📄 /pages/dashboard/efatura/index.js
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EFaturaPanel() {
  const [access, setAccess] = useState({ loading: true, allowed: false, status: "none" });
  const [kontor, setKontor] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

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

  // Kullanıcı kontörü (Taxten + yerel) – erişim varken çek
  useEffect(() => {
    if (!access.allowed || access.loading) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("/api/efatura/kontor", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setKontor(data);
        }
      } catch {
        setKontor(null);
      }
    })();
  }, [access.allowed, access.loading]);

  const syncTaxtenBelgeler = async () => {
    setSyncResult(null);
    setSyncLoading(true);
    try {
      const res = await fetch("/api/efatura/sync-taxten-belgeler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success && (data.sent > 0 || data.incoming > 0 || data.irsaliyeSent > 0 || data.irsaliyeIncoming > 0)) {
        setKontor((prev) => prev ? { ...prev } : null);
      }
    } catch (err) {
      setSyncResult({ success: false, message: err.message || "İstek başarısız" });
    } finally {
      setSyncLoading(false);
    }
  };

  if (access.loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  // Erişim durumunu yeniden kontrol et (onay sonrası sayfa yenilemeden güncelleme)
  const refreshAccess = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/efatura/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAccess((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setAccess((prev) => ({ ...prev, allowed: false, status: "error" }));
    }
  };

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

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={refreshAccess}
              className="inline-block bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
            >
              🔄 Durumu yenile
            </button>
            <Link
              href="/dashboard/edonusum/efatura-basvuru"
              className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              📝 E-Fatura Başvurusu Yap
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Başvurunuz onaylandıysa &quot;Durumu yenile&quot;ye tıklayın veya sayfayı yenileyin (F5).
          </p>
        </div>
      </div>
    );
  }

  // ✅ Onaylı ise mevcut panel
  const kontorRemaining = kontor?.remaining ?? kontor?.limit != null ? (kontor.limit - (kontor.used ?? 0)) : null;
  const kontorUsed = kontor?.used ?? 0;
  const kontorFromTaxten = kontor?.fromTaxten === true;
  const kontorLow = kontorRemaining != null && kontorRemaining <= 10 && kontorRemaining > 0;
  const kontorExhausted = kontorRemaining != null && kontorRemaining <= 0;

  return (
    <div className="p-6 space-y-6">

      {/* Başlık */}
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 E-Fatura, E-Arşiv & E-İrsaliye
      </h1>

      {/* Taxten gelen/giden fatura ve irsaliye senkronu */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800">Taxten panelinden gelen/giden listeler</p>
          <p className="text-sm text-slate-500">Fatura ve irsaliye listesini Taxten’den çekip ERP’de görüntüleyin (son 30 gün).</p>
        </div>
        <button
          type="button"
          onClick={syncTaxtenBelgeler}
          disabled={syncLoading}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {syncLoading ? "Çekiliyor..." : "Taxten'den listeyi çek"}
        </button>
      </div>
      {syncResult && (
        <div className={`rounded-xl p-4 text-sm ${syncResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          {syncResult.message}
          {syncResult.success && (syncResult.sent > 0 || syncResult.incoming > 0 || syncResult.irsaliyeSent > 0 || syncResult.irsaliyeIncoming > 0) && (
            <span className="block mt-1">
              Giden fatura: {syncResult.sent ?? 0}, Gelen fatura: {syncResult.incoming ?? 0}, Giden irsaliye: {syncResult.irsaliyeSent ?? 0}, Gelen irsaliye: {syncResult.irsaliyeIncoming ?? 0}
            </span>
          )}
          {syncResult.errors?.length > 0 && (
            <span className="block mt-1 text-amber-700">{syncResult.errors.join("; ")}</span>
          )}
          {syncResult.debug && (
            <pre className="mt-2 p-2 bg-white/60 rounded text-xs overflow-auto max-h-24">{JSON.stringify(syncResult.debug, null, 2)}</pre>
          )}
        </div>
      )}

      {/* Kontör özeti – Taxten + yerel entegre */}
      {kontor != null && (
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-500 text-sm">Kalan kontör</span>
              <p className="text-2xl font-bold text-slate-800">
                {kontorRemaining != null ? kontorRemaining : "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-sm">Kullanılan</span>
              <p className="text-xl font-semibold text-slate-700">{kontorUsed}</p>
            </div>
            {kontorFromTaxten && (
              <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                ✓ Taxten panelden
              </span>
            )}
          </div>
          <Link
            href="/dashboard/e-donusum/efatura-kontor"
            className="text-orange-600 hover:underline font-medium text-sm"
          >
            Detay ve kullanım →
          </Link>
          {kontorExhausted && (
            <p className="w-full text-red-600 text-sm mt-1">
              Kontörünüz tükenmiş. Taxten panelinden yükleme yapın veya admin ile iletişime geçin.
            </p>
          )}
          {kontorLow && !kontorExhausted && (
            <p className="w-full text-amber-600 text-sm mt-1">
              Kontörünüz az. Yükleme yapmanız önerilir.
            </p>
          )}
        </div>
      )}

      {/* Üst Hızlı Menü */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        <Link href="/dashboard/efatura/olustur"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border border-orange-200">
          <div className="text-3xl">➕</div>
          <div className="mt-2 font-bold">Yeni Fatura Oluştur</div>
        </Link>

        <Link href="/dashboard/efatura/gelenler"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border">
          <div className="text-3xl">📥</div>
          <div className="mt-2 font-bold">Gelen Faturalar</div>
        </Link>

        <Link href="/dashboard/efatura/gonderilenler"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border">
          <div className="text-3xl">📤</div>
          <div className="mt-2 font-bold">Giden Faturalar</div>
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

        <Link href="/dashboard/irsaliye"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border border-orange-200">
          <div className="text-3xl">📋</div>
          <div className="mt-2 font-bold">E-İrsaliye</div>
        </Link>

        <Link href="/dashboard/e-donusum/efatura-kontor"
          className="p-5 bg-white shadow rounded-xl hover:shadow-md transition text-center border border-orange-200">
          <div className="text-3xl">🧾</div>
          <div className="mt-2 font-bold">Kontör</div>
          {kontor != null && kontorRemaining != null && (
            <div className="mt-1 text-sm text-slate-600">Kalan: {kontorRemaining}</div>
          )}
        </Link>

      </div>

      <p className="text-sm text-slate-500 text-center">
        Logo ve imza için <strong>E-Fatura Başvuru</strong> veya <strong>Firma Ayarları</strong> sayfasından yükleme yapabilirsiniz.
      </p>

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
