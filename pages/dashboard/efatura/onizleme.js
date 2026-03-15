// 📄 /pages/dashboard/efatura/onizleme.js
// Taslak fatura önizleme – PDF tabanlı (XSLT hatası yok, her zaman çalışır)
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function EFaturaOnizleme() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [error, setError] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const iframeRef = useRef(null);

  // PDF ile önizleme (PdfEngine + efaturaDraft şablonu – XSLT bağımlılığı yok)
  const fetchPdfPreview = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    setPdfBlobUrl(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");

      const res = await fetch(`/api/efatura/draft-pdf?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.message || "PDF alınamadı");
      }

      const blob = await res.blob();
      if (blob.size < 100) throw new Error("PDF oluşturulamadı (boş veya hatalı)");

      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error("PDF Önizleme Hatası:", err);
      setError(err.message || "Önizleme yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && id) {
      fetchPdfPreview();
    }
    return () => {
      setPdfBlobUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [router.isReady, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!id) return;
    if (
      !confirm(
        "Bu taslak e-faturayı entegratör (test) hesabı üzerinden göndermek istiyor musun? Devam etmek istiyor musun?"
      )
    )
      return;

    setSending(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/efatura/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: String(id), isDraft: true }), // veya false
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "E-fatura gönderilemedi");
      }
      // Önce yönlendir; başarı mesajı "Gönderilen Faturalar" sayfasındaki banner'da gösterilir
      router.push("/dashboard/efatura/gonderilenler?gonderildi=1");
    } catch (err) {
      setError(err.message || "E-fatura gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleMailToCustomer = async (withPdf = false) => {
    if (!id) return;
    setEmailSending(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/efatura/send-customer-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftId: String(id),
          attachPdf: withPdf,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "E-posta gönderilemedi");
      alert(data.message || "E-posta gönderildi.");
    } catch (err) {
      setError(err.message || "E-posta gönderilemedi");
    } finally {
      setEmailSending(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handlePdfDownload = async () => {
    if (!id) return;
    setPdfDownloading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/draft-pdf?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "PDF indirilemedi");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `E-Fatura-Onizleme-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "PDF indirilemedi");
    } finally {
      setPdfDownloading(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        ❌ Geçersiz istek. URL'de ?id= parametresi yok.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">
          🧾 E-Fatura Önizleme
        </h1>
        <button
          className="btn-gray"
          onClick={() => router.push("/dashboard/efatura/taslak")}
        >
          ⬅ Taslaklara Dön
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
          <strong>Hata Meydana Geldi:</strong> {error}
        </div>
      )}

      {/* Butonlar */}
      <div className="flex flex-wrap justify-between gap-2 items-center bg-white p-3 rounded-xl shadow">
        <div className="flex gap-2">
          <button
            className="btn-gray"
            onClick={() =>
              router.push(`/dashboard/efatura/olustur?id=${id}`)
            }
          >
            ✏️ Taslağı Düzenle
          </button>
          <button
            type="button"
            className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-1"
            onClick={handlePdfDownload}
            disabled={loading || pdfDownloading}
          >
            {pdfDownloading ? "İndiriliyor…" : "📥 PDF İndir"}
          </button>
          <button
            type="button"
            className="btn-gray flex items-center gap-1"
            onClick={handlePrint}
            disabled={loading || !pdfBlobUrl}
          >
            🖨️ Yazdır
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary bg-blue-600 hover:bg-blue-700"
            onClick={() => handleMailToCustomer(true)}
            disabled={emailSending}
          >
            {emailSending ? "Gönderiliyor..." : "📧 Müşteriye E-posta"}
          </button>
          <button
            className="btn-primary bg-orange-600 hover:bg-orange-700"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Gönderiliyor..." : "📤 Entegratöre Gönder"}
          </button>
        </div>
      </div>

      {/* Önizleme Alanı – PDF */}
      <div className="bg-white p-1 rounded-xl shadow w-full" style={{ height: "800px" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">PDF yükleniyor...</div>
        ) : pdfBlobUrl ? (
          <iframe
            ref={iframeRef}
            src={pdfBlobUrl}
            title="E-Fatura Önizleme"
            className="w-full h-full border-none"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            {error || "Önizleme oluşturulamadı."}
          </div>
        )}
      </div>
    </div>
  );
}
