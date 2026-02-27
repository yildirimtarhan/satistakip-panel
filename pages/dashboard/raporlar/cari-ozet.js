import { useState, useEffect } from "react";
import { Users, DollarSign, TrendingUp, ShoppingCart, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function CariOzetPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setError("Oturum açmanız gerekiyor.");
      setLoading(false);
      return;
    }
    fetch("/api/reports/cari-ozet", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setData(result);
        else setError(result.message || "Veri alınamadı");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 flex justify-center">Yükleniyor...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Veri bulunamadı.</div>;

  const {
    summary = {},
    cariler = [],
    borcluFirmalar = [],
    alacakliFirmalar = [],
    dovizliAlisYapilanCariler = [],
    dovizliSatisYapilanCariler = []
  } = data;

  const fmtTRY = (n) => (n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  const fmtFCY = (n) => (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Cari Özet Raporu</h1>
      <p className="text-gray-500 mb-6">Cari bazlı ciro, alış, tahsilat ve bakiye özeti</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <Users className="text-blue-600" size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-500">Cari Sayısı</div>
            <div className="text-xl font-bold">{summary.cariSayisi ?? 0}</div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50">
            <TrendingUp className="text-green-600" size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-500">Toplam Ciro (Satış)</div>
            <div className="text-xl font-bold text-green-700">
              {fmtTRY(summary.toplamCiro)} ₺
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-50">
            <ShoppingCart className="text-violet-600" size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-500">Toplam Alış (Ürün aldığın)</div>
            <div className="text-xl font-bold text-violet-700">
              {fmtTRY(summary.toplamAlis)} ₺
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50">
            <DollarSign className="text-emerald-600" size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-500">Toplam Tahsilat</div>
            <div className="text-xl font-bold text-emerald-700">
              {fmtTRY(summary.toplamTahsilat)} ₺
            </div>
          </div>
        </div>
      </div>

      {((summary.toplamCiroUSD ?? 0) > 0 || (summary.toplamCiroEUR ?? 0) > 0 || (summary.toplamAlisUSD ?? 0) > 0 || (summary.toplamAlisEUR ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm border-blue-100">
            <div className="text-sm text-gray-500">Dövizli satış (USD)</div>
            <div className="text-lg font-bold text-blue-700">{fmtFCY(summary.toplamCiroUSD)} $</div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm border-indigo-100">
            <div className="text-sm text-gray-500">Dövizli satış (EUR)</div>
            <div className="text-lg font-bold text-indigo-700">{fmtFCY(summary.toplamCiroEUR)} €</div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm border-amber-100">
            <div className="text-sm text-gray-500">Dövizli alış (USD)</div>
            <div className="text-lg font-bold text-amber-700">{fmtFCY(summary.toplamAlisUSD)} $</div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm border-orange-100">
            <div className="text-sm text-gray-500">Dövizli alış (EUR)</div>
            <div className="text-lg font-bold text-orange-700">{fmtFCY(summary.toplamAlisEUR)} €</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100">
            <ArrowDownCircle className="text-amber-700" size={28} />
          </div>
          <div>
            <div className="text-sm text-amber-800 font-medium">Borçlu olduğunuz firmalar (toplam bakiye)</div>
            <div className="text-xl font-bold text-amber-900">
              {fmtTRY(summary.toplamBorclu)} ₺
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100">
            <ArrowUpCircle className="text-green-700" size={28} />
          </div>
          <div>
            <div className="text-sm text-green-800 font-medium">Alacaklı olduğunuz firmalar (toplam bakiye)</div>
            <div className="text-xl font-bold text-green-900">
              {fmtTRY(summary.toplamAlacak)} ₺
            </div>
          </div>
        </div>
      </div>

      {borcluFirmalar.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden mb-6">
          <h2 className="px-4 py-3 font-semibold text-amber-900 border-b border-amber-200">Borçlu olduğunuz firmalar (ürün aldığınız / borçlandığınız)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-100">
                <tr>
                  <th className="text-left px-4 py-2">Firma</th>
                  <th className="text-left px-4 py-2">İletişim</th>
                  <th className="text-right px-4 py-2">Alış (₺)</th>
                  <th className="text-right px-4 py-2">Tahsilat/Ödeme (₺)</th>
                  <th className="text-right px-4 py-2">Bakiye (₺)</th>
                </tr>
              </thead>
              <tbody>
                {borcluFirmalar.map((c) => (
                  <tr key={c._id} className="border-t border-amber-100">
                    <td className="px-4 py-2 font-medium">{c.ad || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{[c.telefon, c.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.alisTutari)}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.tahsilat)}</td>
                    <td className="text-right px-4 py-2 font-bold text-amber-800">{fmtTRY(c.bakiye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dovizliAlisYapilanCariler.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg overflow-hidden mb-6">
          <h2 className="px-4 py-3 font-semibold text-amber-900 border-b border-amber-200">Dövizli alış yapılan tedarikçiler (USD/EUR)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-100">
                <tr>
                  <th className="text-left px-4 py-2">Firma</th>
                  <th className="text-right px-4 py-2">Alış USD ($)</th>
                  <th className="text-right px-4 py-2">Alış EUR (€)</th>
                  <th className="text-right px-4 py-2">Alış TRY (₺)</th>
                </tr>
              </thead>
              <tbody>
                {dovizliAlisYapilanCariler.map((c) => (
                  <tr key={c._id} className="border-t border-amber-100">
                    <td className="px-4 py-2 font-medium">{c.ad || "—"}</td>
                    <td className="text-right px-4 py-2 text-amber-800">{(c.alisUSD ?? 0) > 0 ? fmtFCY(c.alisUSD) : "—"}</td>
                    <td className="text-right px-4 py-2 text-amber-800">{(c.alisEUR ?? 0) > 0 ? fmtFCY(c.alisEUR) : "—"}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.alisTutari)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dovizliSatisYapilanCariler.length > 0 && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg overflow-hidden mb-6">
          <h2 className="px-4 py-3 font-semibold text-blue-900 border-b border-blue-200">Dövizli satış yapılan müşteriler (USD/EUR)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-100">
                <tr>
                  <th className="text-left px-4 py-2">Firma</th>
                  <th className="text-right px-4 py-2">Ciro USD ($)</th>
                  <th className="text-right px-4 py-2">Ciro EUR (€)</th>
                  <th className="text-right px-4 py-2">Ciro TRY (₺)</th>
                </tr>
              </thead>
              <tbody>
                {dovizliSatisYapilanCariler.map((c) => (
                  <tr key={c._id} className="border-t border-blue-100">
                    <td className="px-4 py-2 font-medium">{c.ad || "—"}</td>
                    <td className="text-right px-4 py-2 text-blue-800">{(c.ciroUSD ?? 0) > 0 ? fmtFCY(c.ciroUSD) : "—"}</td>
                    <td className="text-right px-4 py-2 text-blue-800">{(c.ciroEUR ?? 0) > 0 ? fmtFCY(c.ciroEUR) : "—"}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.ciro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alacakliFirmalar.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden mb-6">
          <h2 className="px-4 py-3 font-semibold text-green-900 border-b border-green-200">Alacaklı olduğunuz firmalar (müşteriler – size borçlu)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-green-100">
                <tr>
                  <th className="text-left px-4 py-2">Firma</th>
                  <th className="text-left px-4 py-2">İletişim</th>
                  <th className="text-right px-4 py-2">Ciro (₺)</th>
                  <th className="text-right px-4 py-2">Tahsilat (₺)</th>
                  <th className="text-right px-4 py-2">Bakiye (₺)</th>
                </tr>
              </thead>
              <tbody>
                {alacakliFirmalar.map((c) => (
                  <tr key={c._id} className="border-t border-green-100">
                    <td className="px-4 py-2 font-medium">{c.ad || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{[c.telefon, c.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.ciro)}</td>
                    <td className="text-right px-4 py-2">{fmtTRY(c.tahsilat)}</td>
                    <td className="text-right px-4 py-2 font-bold text-green-800">{fmtTRY(c.bakiye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <h2 className="px-4 py-3 font-semibold border-b">Tüm Cariler (ciro / alışa göre sıralı)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Cari</th>
                <th className="text-left px-4 py-3">İletişim</th>
                <th className="text-right px-4 py-3">Ciro (₺)</th>
                <th className="text-right px-4 py-3">Ciro $/€</th>
                <th className="text-right px-4 py-3">Alış (₺)</th>
                <th className="text-right px-4 py-3">Alış $/€</th>
                <th className="text-right px-4 py-3">Tahsilat (₺)</th>
                <th className="text-right px-4 py-3">Bakiye (₺)</th>
              </tr>
            </thead>
            <tbody>
              {cariler.map((c) => (
                <tr key={c._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.ad || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{[c.telefon, c.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="text-right px-4 py-3">{fmtTRY(c.ciro)}</td>
                  <td className="text-right px-4 py-3 text-gray-600">
                    {((c.ciroUSD ?? 0) > 0 || (c.ciroEUR ?? 0) > 0)
                      ? [c.ciroUSD > 0 && `${fmtFCY(c.ciroUSD)} $`, c.ciroEUR > 0 && `${fmtFCY(c.ciroEUR)} €`].filter(Boolean).join(" · ")
                      : "—"}
                  </td>
                  <td className="text-right px-4 py-3 text-violet-600">{fmtTRY(c.alisTutari)}</td>
                  <td className="text-right px-4 py-3 text-gray-600">
                    {((c.alisUSD ?? 0) > 0 || (c.alisEUR ?? 0) > 0)
                      ? [c.alisUSD > 0 && `${fmtFCY(c.alisUSD)} $`, c.alisEUR > 0 && `${fmtFCY(c.alisEUR)} €`].filter(Boolean).join(" · ")
                      : "—"}
                  </td>
                  <td className="text-right px-4 py-3 text-green-600">{fmtTRY(c.tahsilat)}</td>
                  <td className={`text-right px-4 py-3 font-medium ${(c.bakiye ?? 0) > 0 ? "text-amber-600" : (c.bakiye ?? 0) < 0 ? "text-green-600" : "text-gray-500"}`}>
                    {fmtTRY(c.bakiye)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cariler.length === 0 && <div className="text-center py-12 text-gray-500">Cari kaydı yok.</div>}
      </div>
    </div>
  );
}
