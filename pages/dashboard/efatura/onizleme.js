// 📄 /pages/dashboard/efatura/onizleme.js
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function EFaturaOnizleme() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [error, setError] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const iframeRef = useRef(null);

  // XML'i çekip HTML'e çeviren fonksiyon
  const fetchAndRenderXml = async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/draft-xml?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.message || "Fatura XML'i alınamadı");
      }

      const xmlText = await res.text();
      
      // XSLT Base64 verisini bul
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        throw new Error("XML parse hatası: " + parserError[0].textContent);
      }

      // cbc:EmbeddedDocumentBinaryObject içeriğini (Base64) al
      const embeddedNode = xmlDoc.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0] || 
                           xmlDoc.getElementsByTagNameNS("*", "EmbeddedDocumentBinaryObject")[0];
                           
      if (!embeddedNode || !embeddedNode.textContent) {
        throw new Error("XSLT şablonu bulunamadı. Fatura UBL verisinde XSLT eklentisi eksik.");
      }

      const base64Xslt = embeddedNode.textContent.trim();
      
      // atob hatası (InvalidCharacterError) almamak için tüm boşluk ve geçersiz karakterleri temizle
      let cleanBase64 = base64Xslt.replace(/[^A-Za-z0-9+/=]/g, "");
      
      // Uzunluğu 4'ün katı değilse padding (=) ekle
      while (cleanBase64.length % 4 !== 0) {
        cleanBase64 += "=";
      }
      
      // Base64 to Text (Unicode handle error)
      let xsltText = "";
      try {
        // btoa / atob türkçe karakterleri bozar, uri decode ile çözelim
        const binaryString = window.atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        xsltText = new TextDecoder("utf-8").decode(bytes);
      } catch(e) {
        xsltText = window.atob(cleanBase64);
      }
      
      // XSLTDoc oluştur
      const xsltDoc = parser.parseFromString(xsltText, "application/xml");
      const xsltParserError = xsltDoc.getElementsByTagName("parsererror");
      if (xsltParserError.length > 0) {
        throw new Error("XSLT parse hatası");
      }

      // XSLTProcessor ile XML'i HTML'e çevir
      const xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(xsltDoc);
      const resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
      
      if (!resultDocument) {
        throw new Error("XSLT dönüşümü başarısız oldu.");
      }

      // Fragmentı string'e çevir
      const div = document.createElement('div');
      div.appendChild(resultDocument);
      setHtmlContent(div.innerHTML);

    } catch (err) {
      console.error("XSLT Dönüşüm Hatası:", err);
      setError(err.message || "Görsel oluşturulurken hata meydana geldi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAndRenderXml();
    }
  }, [id]);

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
      alert(data.message || "E-fatura entegratöre gönderildi (test hesabı).");
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
          🧾 Orijinal GİB e-Fatura Önizlemesi
        </h1>
        <button
          className="btn-gray"
          onClick={() => router.push("/dashboard/efatura/taslaklar")}
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
            className="btn-gray flex items-center gap-1"
            onClick={handlePrint}
            disabled={loading || !htmlContent}
          >
            🖨️ Yazdır / PDF Kaydet
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary bg-blue-600 hover:bg-blue-700"
            onClick={() => handleMailToCustomer(false)}
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

      {/* Önizleme Alanı */}
      <div className="bg-white p-1 rounded-xl shadow w-full" style={{ height: "800px" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">Yükleniyor ve XSLT derleniyor...</div>
        ) : htmlContent ? (
          <iframe 
            ref={iframeRef}
            srcDoc={htmlContent} 
            title="E-Fatura Önizleme" 
            className="w-full h-full border-none"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Önizleme oluşturulamadı.
          </div>
        )}
      </div>
    </div>
  );
}
