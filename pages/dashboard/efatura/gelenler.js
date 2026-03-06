// 📄 Gelen E-Faturalar – Taxten tarzı: İndir, Önizleme, Kabul/Ret, İade Et, Detay
import { useEffect, useState } from "react";
import Link from "next/link";

const PERIODS = [
  { label: "1 Gün", days: 1 },
  { label: "1 Hafta", days: 7 },
  { label: "1 Ay", days: 30 },
  { label: "3 Ay", days: 90 },
  { label: "6 Ay", days: 180 },
  { label: "1 Yıl", days: 365 },
];

export default function GelenlerEFatura() {
  const [faturalar, setFaturalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [searchQ, setSearchQ] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [kabulRetOpen, setKabulRetOpen] = useState(false);

  const fetchFaturalar = async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - periodDays);
      const params = new URLSearchParams({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
      if (searchQ.trim()) params.set("q", searchQ.trim());
      const res = await fetch(`/api/efatura/incoming?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFaturalar(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      console.error("Gelen fatura listesi alınamadı:", err);
      setFaturalar([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaturalar();
  }, [periodDays]);

  const token = () => localStorage.getItem("token");

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === faturalar.length) setSelectedIds([]);
    else setSelectedIds(faturalar.map((f) => f._id));
  };

  const handleRespond = async (action) => {
    if (!selectedIds.length) {
      alert("Lütfen en az bir fatura seçin.");
      return;
    }
    if (!confirm(`${action === "accept" ? "Kabul" : "Ret"} işlemi seçili ${selectedIds.length} faturaya uygulanacak. Onaylıyor musunuz?`)) return;
    setActionLoading("respond");
    try {
      const res = await fetch("/api/efatura/incoming/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "İşlem tamamlandı.");
        fetchFaturalar();
      } else alert(data.message || "İşlem başarısız.");
    } catch (e) {
      alert("Hata: " + (e.message || "İşlem yapılamadı."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async () => {
    if (!selectedIds.length) {
      alert("Lütfen en az bir fatura seçin.");
      return;
    }
    if (!confirm(`İade işlemi seçili ${selectedIds.length} faturaya uygulanacak. Onaylıyor musunuz?`)) return;
    setActionLoading("return");
    try {
      const res = await fetch("/api/efatura/incoming/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "İade işlemi başlatıldı.");
        fetchFaturalar();
      } else alert(data.message || "İşlem başarısız.");
    } catch (e) {
      alert("Hata: " + (e.message || "İşlem yapılamadı."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await fetch(`/api/efatura/incoming/download?id=${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "İndirilemedi");
        return;
      }
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
        return;
      }
      if (data.pdfBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0))], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `gelen-fatura-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("Bu fatura için PDF mevcut değil.");
      }
    } catch (e) {
      alert("İndirme hatası: " + (e.message || "Bilinmeyen hata"));
    }
  };

  const handlePreview = (id) => {
    window.open(`/dashboard/efatura/gelen-onizleme?id=${id}`, "_blank", "width=800,height=600");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">📥 Gelen Fatura</h1>
      <p className="text-slate-600 text-sm">Gelen fatura listesi.</p>

      {/* Tarih filtreleri + Ara */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setPeriodDays(p.days)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              periodDays === p.days ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            placeholder="Ara..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <button
            type="button"
            onClick={fetchFaturalar}
            className="px-4 py-1.5 bg-slate-700 text-white rounded-lg text-sm"
          >
            Ara
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((o) => !o)}
        className="text-sm text-slate-600 hover:underline"
      >
        {advancedOpen ? "▲" : "▼"} Gelişmiş filtreleri göster
      </button>

      {/* Araç çubuğu – Taxten tarzı */}
      <div className="flex flex-wrap items-center gap-2 py-2 border-b">
        <button
          type="button"
          onClick={() => selectedIds.length === 1 && handleDownload(selectedIds[0])}
          disabled={selectedIds.length !== 1}
          className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm disabled:opacity-50"
          title="Seçili 1 faturayı indir"
        >
          📄 İndir
        </button>
        <button
          type="button"
          onClick={() => selectedIds.length === 1 && handlePreview(selectedIds[0])}
          disabled={selectedIds.length !== 1}
          className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm disabled:opacity-50"
          title="Seçili 1 faturayı önizle"
        >
          👁️ Önizleme
        </button>
        <div className="relative">
          <button
            type="button"
            disabled={!selectedIds.length || actionLoading === "respond"}
            onClick={() => setKabulRetOpen((o) => !o)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {actionLoading === "respond" ? "..." : "⚙️ Kabul/Ret ▼"}
          </button>
          {kabulRetOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setKabulRetOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button type="button" className="block w-full text-left px-3 py-1.5 hover:bg-slate-100 text-sm" onClick={() => { handleRespond("accept"); setKabulRetOpen(false); }}>
                  Kabul
                </button>
                <button type="button" className="block w-full text-left px-3 py-1.5 hover:bg-slate-100 text-sm" onClick={() => { handleRespond("reject"); setKabulRetOpen(false); }}>
                  Ret
                </button>
              </div>
            </>
          )}
        </div>
        <button type="button" className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm opacity-70" title="Yanıt indir (entegrasyon sonrası)">
          📥 Yanıt İndir
        </button>
        <button
          type="button"
          onClick={handleReturn}
          disabled={!selectedIds.length || actionLoading === "return"}
          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {actionLoading === "return" ? "..." : "↩️ İade Et"}
        </button>
        <button type="button" className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm opacity-70" title="Arşivle (entegrasyon sonrası)">
          📁 Arşivle
        </button>
        <button type="button" className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm opacity-70" title="İşaretle (entegrasyon sonrası)">
          ✓ İşaretle
        </button>
        {selectedIds.length === 1 && (
          <Link
            href={`/dashboard/efatura/gelen-detay?id=${selectedIds[0]}`}
            className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm"
          >
            📋 Detay
          </Link>
        )}
      </div>

      {loading && <div className="text-center py-8">Yükleniyor...</div>}

      {!loading && faturalar.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow text-center text-slate-500">
          <p className="font-medium">Veri bulunamadı</p>
          <p className="text-sm mt-1">GİB / Taxten entegrasyonu ile gelen e-faturalar burada listelenecektir.</p>
        </div>
      )}

      {!loading && faturalar.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-2 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={faturalar.length > 0 && selectedIds.length === faturalar.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Gönderici</th>
                <th className="px-3 py-2 text-left">Geliş Tarihi</th>
                <th className="px-3 py-2 text-left">Fatura Tarihi</th>
                <th className="px-3 py-2 text-right">V.H. Tutar</th>
                <th className="px-3 py-2 text-right">Tutar</th>
                <th className="px-3 py-2 text-left">Senaryo</th>
                <th className="px-3 py-2 text-left">Fatura Türü</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">GİB Durumu</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {faturalar.map((f) => {
                const no = f.invoiceNo || f.faturaNo || "-";
                const sender = f.senderTitle || f.gonderen || "—";
                const receivedAt = f.receivedAt || f.createdAt;
                const issueDate = f.issueDate || f.faturaTarihi || receivedAt;
                const totalExcl = f.totalExclVat ?? f.vatExcluded ?? f.total * (1 - (f.kdvOrani ?? 20) / 100);
                const total = f.total ?? f.payableAmount ?? 0;
                const scenario = f.scenario || f.senaryo || "-";
                const invType = f.invoiceType || f.tip || "-";
                const status = f.responseStatus || f.durum || "—";
                const gibStatus = f.gibStatus || f.gibDurumu || "—";
                const id = f._id;
                return (
                  <tr key={id} className="border-b hover:bg-slate-50">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleSelect(id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2">{no}</td>
                    <td className="px-3 py-2">{sender}</td>
                    <td className="px-3 py-2">{receivedAt ? new Date(receivedAt).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="px-3 py-2">{issueDate ? new Date(issueDate).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="px-3 py-2 text-right">₺{Number(totalExcl || 0).toLocaleString("tr-TR")}</td>
                    <td className="px-3 py-2 text-right font-medium">₺{Number(total).toLocaleString("tr-TR")}</td>
                    <td className="px-3 py-2">{scenario}</td>
                    <td className="px-3 py-2">{invType}</td>
                    <td className="px-3 py-2">
                      {status === "accepted" && <span className="text-green-600">Kabul</span>}
                      {status === "rejected" && <span className="text-red-600">Ret</span>}
                      {status === "returned" && <span className="text-amber-600">İade</span>}
                      {!["accepted", "rejected", "returned"].includes(status) && (status !== "—" ? status : "—")}
                    </td>
                    <td className="px-3 py-2">{gibStatus}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => handlePreview(id)} className="text-orange-600 hover:underline mr-1" title="Önizle">
                        👁️
                      </button>
                      <button type="button" onClick={() => handleDownload(id)} className="text-orange-600 hover:underline mr-1" title="İndir">
                        📄
                      </button>
                      <Link href={`/dashboard/efatura/gelen-detay?id=${id}`} className="text-blue-600 hover:underline" title="Detay">
                        📋
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 text-sm text-slate-500 border-t">
            Toplam: {faturalar.length}
          </div>
        </div>
      )}
    </div>
  );
}
