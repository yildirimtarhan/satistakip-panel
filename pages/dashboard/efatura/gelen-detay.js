// 📄 Gelen fatura detay sayfası
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function GelenDetay() {
  const router = useRouter();
  const { id } = router.query;
  const [fatura, setFatura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    fetchFatura();
    fetchAndRenderXml();
  }, [id]);

  const fetchFatura = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/incoming/single?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFatura(data);
    } catch (err) {
      console.error("Gelen fatura alınamadı:", err);
    }
  };

  // XML'i çekip HTML'e çeviren fonksiyon
  const fetchAndRenderXml = async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/incoming-xml?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.message || "Fatura XML'i alınamadı");
      }

      const xmlText = await res.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        throw new Error("XML parse hatası: " + parserError[0].textContent);
      }

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
      
      let xsltText = "";
      try {
        const binaryString = window.atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        xsltText = new TextDecoder("utf-8").decode(bytes);
      } catch(e) {
        xsltText = window.atob(cleanBase64);
      }
      
      const xsltDoc = parser.parseFromString(xsltText, "application/xml");
      const xsltParserError = xsltDoc.getElementsByTagName("parsererror");
      if (xsltParserError.length > 0) {
        throw new Error("XSLT parse hatası");
      }

      const xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(xsltDoc);
      const resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
      
      if (!resultDocument) {
        throw new Error("XSLT dönüşümü başarısız oldu.");
      }

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

  const no = fatura?.invoiceNo || fatura?.faturaNo || "-";
  const sender = fatura?.senderTitle || fatura?.gonderen || "—";
  const total = fatura?.total ?? fatura?.payableAmount ?? 0;
  const status = fatura?.responseStatus || fatura?.durum || "—";

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">📥 Gelen Fatura Detay</h1>
        <div className="flex gap-2">
          {fatura?.pdfUrl && (
            <a href={fatura.pdfUrl} target="_blank" rel="noreferrer" className="btn-gray border-orange-200 text-orange-600 font-medium hover:bg-orange-50">
              📄 Entegratör PDF İndir
            </a>
          )}
          <Link href="/dashboard/efatura/gelenler" className="btn-gray">
            ← Listeye Dön
          </Link>
        </div>
      </div>

      {fatura && (
        <div className="bg-white p-4 rounded-xl shadow flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="text-lg font-bold">Fatura No: {no}</div>
            <div className="text-sm text-slate-500">Gönderici: <span className="font-semibold text-slate-700">{sender}</span></div>
            <div className="text-sm text-slate-500 mt-1">
              Geliş: {fatura.receivedAt ? new Date(fatura.receivedAt).toLocaleString("tr-TR") : "—"} • 
              Tarih: {fatura.issueDate ? new Date(fatura.issueDate).toLocaleDateString("tr-TR") : "—"}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
             <div className="font-bold text-lg text-orange-600">
                ₺{Number(total).toLocaleString("tr-TR", {minimumFractionDigits:2})}
             </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Durum:</span>
                {status === "accepted" && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm">Kabul</span>}
                {status === "rejected" && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-sm">Ret</span>}
                {status === "returned" && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm">İade</span>}
                {!["accepted", "rejected", "returned"].includes(status) && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-sm">{status}</span>}
             </div>
             <button
                type="button"
                className="btn-gray flex items-center gap-1 text-sm py-1 mt-1"
                onClick={handlePrint}
                disabled={loading || !htmlContent}
              >
                🖨️ Yazdır / PDF İndir
              </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
          <strong>Hata Meydana Geldi:</strong> {error}
        </div>
      )}

      {/* Önizleme Alanı */}
      <div className="bg-white p-1 rounded-xl shadow w-full" style={{ height: "800px" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">Yükleniyor ve XSLT derleniyor...</div>
        ) : htmlContent ? (
          <iframe 
            ref={iframeRef}
            srcDoc={htmlContent} 
            title="Gelen Fatura Görüntüleyici" 
            className="w-full h-full border-none"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-center p-4">
            <p className="mb-2">Önizleme oluşturulamadı.</p>
            <p className="text-xs">UBL-TR standartlarına uygun, XSLT barındıran geçerli bir XML bulunamadı. Bu faturanın detaylarını yalnızca XML veya Entegratör PDF panelinden görebilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
