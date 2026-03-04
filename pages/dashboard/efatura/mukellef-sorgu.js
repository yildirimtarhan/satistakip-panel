// 📄 /pages/dashboard/efatura/mukellef-sorgu.js – Mükellef (VKN/TCKN) Sorgulama
import { useState } from "react";

export default function MukellefSorgu() {
  const [vknTckn, setVknTckn] = useState("");
  const [loading, setLoading] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState("");

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
        VKN veya TCKN girerek GİB üzerinden mükellef bilgisi sorgulayabilirsiniz.
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
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2"
        >
          {loading ? "Sorgulanıyor..." : "Sorgula"}
        </button>
      </form>

      {hata && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {hata}
        </div>
      )}

      {sonuc && (
        <div className="bg-white p-6 rounded-xl shadow space-y-2">
          <h2 className="font-bold text-slate-800">Sorgu Sonucu</h2>
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
          {!sonuc.unvan && !sonuc.adres && Object.keys(sonuc).length <= 1 && (
            <p className="text-slate-500 text-sm">Kayıt bulunamadı.</p>
          )}
        </div>
      )}
    </div>
  );
}
