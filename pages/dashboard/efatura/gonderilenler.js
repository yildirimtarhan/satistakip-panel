// 📄 /pages/dashboard/efatura/gonderilenler.js – Gönderilen Faturalar (URL: /dashboard/efatura/gonderilenler)
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function GonderilenlerEFatura() {
  const router = useRouter();
  const [faturalar, setFaturalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMailId, setSendingMailId] = useState(null);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [resendLoadingId, setResendLoadingId] = useState(null);
  const [resendEnvLoadingId, setResendEnvLoadingId] = useState(null);
  const [showGonderildiBanner, setShowGonderildiBanner] = useState(false);

  useEffect(() => {
    fetchFaturalar();
  }, []);

  useEffect(() => {
    if (router.isReady && router.query.gonderildi === "1") {
      setShowGonderildiBanner(true);
      router.replace("/dashboard/efatura/gonderilenler", undefined, { shallow: true });
      const t = setTimeout(() => setShowGonderildiBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [router.isReady, router.query.gonderildi]);

  const fetchFaturalar = async () => {
    try {
      const res = await fetch("/api/efatura/sent", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFaturalar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fatura listesi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendCustomerEmail = async (sentId) => {
    setSendingMailId(sentId);
    try {
      const res = await fetch("/api/efatura/send-customer-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ sentId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("E-posta müşteriye gönderildi.");
      } else {
        alert(data.message || "E-posta gönderilemedi");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "E-posta gönderilemedi"));
    } finally {
      setSendingMailId(null);
    }
  };

  const zarfDurumuSorgula = async (f) => {
    setStatusLoadingId(f._id);
    try {
      const res = await fetch("/api/efatura/envelope-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ sentId: String(f._id) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const d = data.data;
        const msg = typeof d === "object" ? JSON.stringify(d, null, 2) : String(d);
        alert(`Zarf durumu (${f.isEarsiv ? "E-Arşiv" : "E-Fatura"}):\n\n${msg}`);
      } else {
        alert(data.error || data.message || "Durum alınamadı");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "Sorgu başarısız"));
    } finally {
      setStatusLoadingId(null);
    }
  };

  const tekrarGonder = async (f) => {
    if (!confirm(`"${f.faturaNo || f.invoiceNo || ""}" numaralı faturayı tekrar göndermek istediğinize emin misiniz? Aynı fatura no / CustInvID ile yeni zarf oluşturulacaktır.`)) return;
    setResendLoadingId(f._id);
    try {
      const res = await fetch("/api/efatura/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ sentId: String(f._id) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Fatura tekrar gönderildi: " + (data.invoiceNumber || data.message || ""));
        fetchFaturalar();
      } else {
        alert(data.error || data.message || "Tekrar gönderim başarısız");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "Tekrar gönderim başarısız"));
    } finally {
      setResendLoadingId(null);
    }
  };

  /** Taxten 2.1.12 RESEND – Zarfı DocData göndermeden yeniden gönder (GİB hata aldıysa) */
  const resendZarf = async (f) => {
    if (!confirm(`"${f.faturaNo || f.invoiceNo || ""}" zarfını Taxten RESEND ile yeniden göndermek istiyor musunuz? (Aynı belge, DocData gönderilmez; yalnızca E-Fatura.)`)) return;
    setResendEnvLoadingId(f._id);
    try {
      const res = await fetch("/api/efatura/resend-envelope", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ sentId: String(f._id) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Zarf RESEND ile yeniden gönderildi: " + (data.message || ""));
        fetchFaturalar();
      } else {
        alert(data.error || data.message || "RESEND başarısız");
      }
    } catch (err) {
      alert("Hata: " + (err.message || "RESEND başarısız"));
    } finally {
      setResendEnvLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📤 Gönderilen Faturalar
      </h1>

      {showGonderildiBanner && (
        <div className="rounded-xl p-4 bg-green-50 border border-green-200 text-green-800 text-center font-medium">
          ✓ Fatura entegratöre gönderildi ve listeye eklendi.
        </div>
      )}

      {loading && <div className="text-center py-8">Yükleniyor...</div>}

      {!loading && faturalar.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow text-center text-slate-500">
          📭 Henüz gönderilmiş fatura yok.
        </div>
      )}

      {!loading && faturalar.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2 text-left">Fatura No</th>
                <th className="px-3 py-2 text-left">Cari</th>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-right">Toplam</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {faturalar.map((f) => (
                <tr key={f._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{f.faturaNo || f.invoiceNo || "-"}</td>
                  <td className="px-3 py-2">{f.cariAd || f.cariName || f.customer?.title || "—"}</td>
                  <td className="px-3 py-2">
                    {(f.sentAt || f.createdAt)
                      ? new Date(f.sentAt || f.createdAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {f.status === "onaylandı" && (
                      <span className="text-green-600 font-semibold">Onaylandı</span>
                    )}
                    {f.status === "reddedildi" && (
                      <span className="text-red-600 font-semibold">Reddedildi</span>
                    )}
                    {f.status === "beklemede" && (
                      <span className="text-orange-600 font-semibold">Beklemede</span>
                    )}
                    {!f.status && <span>-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    ₺{Number(f.toplam || f.total || f.totals?.total || 0).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-wrap gap-2 justify-center items-center">
                      <button
                        type="button"
                        className="text-slate-600 hover:text-slate-800 text-xs disabled:opacity-50"
                        onClick={() => zarfDurumuSorgula(f)}
                        disabled={statusLoadingId === f._id}
                        title="Taxten zarf durumunu sorgula (getEnvelopeStatus)"
                      >
                        {statusLoadingId === f._id ? "…" : "📋 Zarf durumu"}
                      </button>
                      <button
                        type="button"
                        className="text-amber-600 hover:text-amber-800 text-xs disabled:opacity-50"
                        onClick={() => tekrarGonder(f)}
                        disabled={resendLoadingId === f._id}
                        title="Yeni UBL ile tekrar gönder (aynı fatura no / CustInvID, yeni zarf)"
                      >
                        {resendLoadingId === f._id ? "Gönderiliyor…" : "🔄 Tekrar gönder"}
                      </button>
                      {!f.isEarsiv && (f.envUuid || f.taxtenResponse?.EnvUUID) && (
                        <button
                          type="button"
                          className="text-violet-600 hover:text-violet-800 text-xs disabled:opacity-50"
                          onClick={() => resendZarf(f)}
                          disabled={resendEnvLoadingId === f._id}
                          title="Taxten RESEND (2.1.12): Zarfı DocData göndermeden yeniden gönder"
                        >
                          {resendEnvLoadingId === f._id ? "…" : "📤 RESEND zarf"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-indigo-600 disabled:opacity-50"
                        onClick={() => sendCustomerEmail(f._id)}
                        disabled={sendingMailId === f._id}
                        title="Faturayı müşteri e-postasına gönder"
                      >
                        {sendingMailId === f._id ? "Gönderiliyor..." : "📧 Mail"}
                      </button>
                      <Link href={`/dashboard/efatura/detay?id=${f._id}`} className="text-blue-700" title="Detay">
                        👁️
                      </Link>
                      {f.pdfUrl && (
                        <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="text-orange-600" title="PDF">
                          📄
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
