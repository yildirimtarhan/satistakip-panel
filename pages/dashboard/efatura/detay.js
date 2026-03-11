// 📄 /pages/dashboard/efatura/detay.js
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function EFaturaDetay() {
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
      const res = await fetch(`/api/efatura/detail?id=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setFatura(data);
    } catch (err) {
      console.error("Fatura alınamadı:", err);
    }
  };

  // XML'i çekip HTML'e çeviren fonksiyon
  const fetchAndRenderXml = async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/sent-xml?id=${id}`, {
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

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">
          📄 Gönderilen E-Fatura Detay
        </h1>
        <Link href="/dashboard/efatura/gonderilen" className="btn-gray">
          ⬅ Gönderilenlere Dön
        </Link>
      </div>

      {/* ÜST ÖZET */}
      {fatura && (
        <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center gap-4">
          <div>
            <div className="text-lg font-bold">Fatura No: {fatura.faturaNo}</div>
            <div className="text-sm text-slate-500">UUID: {fatura.uuid || fatura.taxtenUuid}</div>
            <div className="text-sm text-slate-600 mt-1">
              Cari: {fatura.cariAd} • VKN/TCKN: {fatura.vergiNo}
            </div>
            <div className="mt-2 text-sm">
              Durum: 
              {fatura.status === "onaylandı" && <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">Onaylandı</span>}
              {fatura.status === "reddedildi" && <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">Reddedildi</span>}
              {(fatura.status === "beklemede" || fatura.status === "sent") && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-200">Gönderildi</span>}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <div className="font-bold text-lg text-orange-600 mb-1">
              {Number((fatura.items?.reduce((a, b) => a + Number(b.tutar || 0), 0) || 0) + (fatura.items?.reduce((a, b) => a + Number(b.kdvTutar || 0), 0) || 0)).toLocaleString("tr-TR", {minimumFractionDigits: 2})} ₺
            </div>
            <button
              type="button"
              className="btn-gray flex items-center gap-1 text-sm py-1"
              onClick={handlePrint}
              disabled={loading || !htmlContent}
            >
              🖨️ Yazdır / PDF İndir
            </button>
            {fatura.pdfUrl && (
              <a
                href={fatura.pdfUrl}
                target="_blank"
                className="text-blue-600 text-sm underline hover:text-blue-800"
              >
                📄 Entegratör PDF Aç
              </a>
            )}
            <button className="text-slate-500 text-xs mt-2 underline" onClick={() => {
              const url = `/api/efatura/sent-xml?id=${id}`;
              window.open(url, '_blank');
            }}>
              ⚙️ Orijinal XML İndir/Gör
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
            title="E-Fatura Görüntüleyici" 
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
