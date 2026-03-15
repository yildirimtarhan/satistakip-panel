// 📄 /pages/dashboard/efatura/mukellef-sorgu.js – Mükellef (VKN/TCKN) Sorgulama (Taxten/GİB)
import { useState } from "react";

export default function MukellefSorgu() {
  const [vknTckn, setVknTckn] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState("");

  const syncCache = async () => {
    setSyncLoading(true);
    setHata("");
    try {
      const res = await fetch("/api/efatura/sync-mukellef-cache", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ daysBack: 90 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Senkronizasyon başarısız.");
      setSonuc(null);
      alert(`Başarılı: ${data.message}`);
    } catch (err) {
      setHata(err.message || "Senkronizasyon hatası.");
    } finally {
      setSyncLoading(false);
    }
  };

  const sorgula = async (e) => {
    e.preventDefault();
    const num = (vknTckn || "").replace(/\D/g, "");
    if (num.length !== 10 && num.length !== 11) {
      setHata("VKN 10, TCKN 11 haneli olmalıdır.");
      setSonuc(null);
      return;
    }
    setHata("");
    setSonuc(null);
    setLoading(true);
    try {
      const res = await fetch("/api/efatura/mukellef-sorgu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ vknTckn: num }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHata(data.message || "Sorgu başarısız.");
        return;
      }
      setSonuc(data);
    } catch (err) {
      setHata("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        🔍 Mükellef Sorgulama
      </h1>
      <p className="text-slate-600 text-center text-sm">
        VKN veya TCKN ile Taxten (GİB entegratörü) üzerinden E-Fatura, E-Arşiv ve E-İrsaliye mükelleflik bilgisi sorgulanır.
      </p>

      <form onSubmit={sorgula} className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <label className="block font-semibold mb-1">VKN / TCKN</label>
          <input
            type="text"
            className="input w-full"
            placeholder="10 veya 11 haneli numara"
            value={vknTckn}
            onChange={(e) => setVknTckn(e.target.value)}
            maxLength={11}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-2"
          >
            {loading ? "Sorgulanıyor..." : "Sorgula"}
          </button>
          <button
            type="button"
            onClick={syncCache}
            disabled={syncLoading}
            className="px-4 py-2 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50 text-sm"
            title="Taxten/GİB mükellef listesini güncelle (son 90 gün)"
          >
            {syncLoading ? "..." : "Liste Güncelle"}
          </button>
        </div>
      </form>

      {hata && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {hata}
        </div>
      )}

      {sonuc && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="font-bold text-slate-800">Sorgu Sonucu</h2>

          {(sonuc.efatura !== undefined || sonuc.earsiv !== undefined || sonuc.eirsaliye !== undefined) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-slate-500 text-xs font-medium">Mükelleflik:</span>
              {sonuc.efatura && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  E-Fatura
                </span>
              )}
              {sonuc.earsiv && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  E-Arşiv
                </span>
              )}
              {sonuc.eirsaliye && (
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  E-İrsaliye
                </span>
              )}
              {!sonuc.efatura && !sonuc.earsiv && !sonuc.eirsaliye && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                  Kayıt bulunamadı
                </span>
              )}
            </div>
          )}

          <dl className="grid grid-cols-1 gap-2 text-sm">
            {sonuc.unvan && (
              <>
                <dt className="text-slate-500">Ünvan / Ad Soyad</dt>
                <dd className="font-medium">{sonuc.unvan}</dd>
              </>
            )}
            {sonuc.adres && (
              <>
                <dt className="text-slate-500">Adres</dt>
                <dd>{sonuc.adres}</dd>
              </>
            )}
            {sonuc.vergiDairesi && (
              <>
                <dt className="text-slate-500">Vergi Dairesi</dt>
                <dd>{sonuc.vergiDairesi}</dd>
              </>
            )}
            {sonuc.vkn && (
              <>
                <dt className="text-slate-500">VKN</dt>
                <dd>{sonuc.vkn}</dd>
              </>
            )}
            {sonuc.tckn && (
              <>
                <dt className="text-slate-500">TCKN</dt>
                <dd>{sonuc.tckn}</dd>
              </>
            )}
          </dl>
          {sonuc.message && (
            <p className="text-amber-600 text-sm">{sonuc.message}</p>
          )}
          {!sonuc.unvan && !sonuc.adres && !sonuc.efatura && !sonuc.earsiv && !sonuc.eirsaliye && !sonuc.message && (
            <p className="text-slate-500 text-sm">Kayıt bulunamadı.</p>
          )}
        </div>
      )}
    </div>
  );
}
