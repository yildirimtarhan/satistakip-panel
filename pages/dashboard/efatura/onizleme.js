// 📄 /pages/dashboard/efatura/onizleme.js
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";

// Taslak API formatından görüntüleme formatına map (customer, items, totals)
function draftToView(draft) {
  if (!draft) return null;
  const items = draft.items || [];
  const kalemler = items.map((k) => ({
    urunAd: k.name ?? k.urunAd ?? "-",
    miktar: k.quantity ?? k.miktar ?? 0,
    birimFiyat: k.price ?? k.birimFiyat ?? 0,
  }));
  const araToplam = draft.totals?.subtotal ?? kalemler.reduce((s, k) => s + Number(k.miktar || 0) * Number(k.birimFiyat || 0), 0);
  const genelIskontoOrani = Number(draft.genelIskontoOrani) || 0;
  const genelIskontoTutar = draft.genelIskontoTutar != null ? Number(draft.genelIskontoTutar) : (araToplam * genelIskontoOrani / 100);
  const araToplamIskontolu = araToplam - genelIskontoTutar;
  const genelToplam = draft.totals?.total ?? draft.genelToplam ?? 0;
  const kdvOrani = items[0]?.kdvOran ?? draft.kdvOrani ?? 20;
  const kdvTutar = Number(genelToplam) - Number(araToplamIskontolu);
  return {
    cariAd: draft.customer?.title ?? draft.cariAd ?? "-",
    kalemler,
    kdvOrani,
    araToplam,
    genelIskontoOrani,
    genelIskontoTutar,
    araToplamIskontolu,
    kdvTutar,
    genelToplam,
    not: draft.notes ?? draft.not ?? "",
    tip: draft.invoiceType ?? draft.tip ?? "EARSIV",
    vadeTarihi: draft.vadeTarihi,
    invoiceNumber: draft.invoiceNumber,
    createdAt: draft.createdAt,
    _id: draft._id,
  };
}

export default function EFaturaOnizleme() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [fatura, setFatura] = useState(null);
  const [error, setError] = useState("");

  const view = useMemo(() => draftToView(fatura), [fatura]);

  // Basit XML string üretici (şimdilik demo amaçlı) – view veya fatura ile uyumlu
  const buildXml = (draft) => {
    if (!draft) return "";
    const v = draftToView(draft);
    const issueDate = new Date(draft.createdAt || Date.now())
      .toISOString()
      .substring(0, 10);
    const linesXml = (v?.kalemler || [])
      .map((k, i) => {
        const miktar = Number(k.miktar || 0);
        const birimFiyat = Number(k.birimFiyat || 0);
        const araToplam = miktar * birimFiyat;
        return `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity>${miktar}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="TRY">${araToplam.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${(k.urunAd || "").replace(/</g, " ")}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="TRY">${birimFiyat.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
      })
      .join("\n") || "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${draft._id}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${(draft.invoiceType || draft.tip) === "IADE" ? "381" : "380"}</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:Name>Kurumsal Tedarikçi</cbc:Name>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:Name>${(v?.cariAd || "Müşteri").replace(/</g, " ")}</cbc:Name>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="TRY">${Number(v?.genelToplam || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
  };

  // Taslak faturayı çek
  const fetchDraft = async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/efatura/drafts?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.message || "Fatura taslağı alınamadı");
      }

      const data = await res.json();
      setFatura(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDraft();
    }
  }, [id]);

  const handleSend = async () => {
    if (!fatura?._id) return;
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
        body: JSON.stringify({ invoiceId: String(fatura._id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "E-fatura gönderilemedi");
      }
      alert(data.message || "E-fatura entegratöre gönderildi (test hesabı).");
      // Taslak üzerindeki numara / tarih güncellenmiş olabilir, yeniden yükle
      await fetchDraft();
    } catch (err) {
      setError(err.message || "E-fatura gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleMailToCustomer = async (withPdf = false) => {
    if (!fatura?._id) return;
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
          draftId: String(fatura._id),
          attachPdf: withPdf,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "E-posta gönderilemedi");
      alert(data.message || "E-posta gönderildi.");
    } catch (err) {
      setError(err.message || "E-posta gönderilemedi");
    } finally {
      setEmailSending(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        ❌ Geçersiz istek. URL'de ?id= parametresi yok.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        ❌ Hata: {error}
        <br />
        <button
          className="btn-gray mt-3"
          onClick={() => router.push("/dashboard/efatura/taslaklar")}
        >
          ⬅ Taslaklara Dön
        </button>
      </div>
    );
  }

  if (!fatura) {
    return (
      <div className="p-6">
        ❌ Fatura taslağı bulunamadı.
        <br />
        <button
          className="btn-gray mt-3"
          onClick={() => router.push("/dashboard/efatura/taslaklar")}
        >
          ⬅ Taslaklara Dön
        </button>
      </div>
    );
  }

  const xmlPreview = buildXml(fatura);
  const araToplam = Number(view?.araToplam ?? 0);
  const kdvTutar = Number(view?.kdvTutar ?? 0);
  const genelToplam = Number(view?.genelToplam ?? 0);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        🧾 E-Fatura Önizleme
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Başlık ve Cari Bilgisi */}
      <div className="bg-white p-4 rounded-xl shadow flex justify-between gap-4">
        <div>
          <p className="font-semibold text-lg">
            {view?.tip === "IADE" ? "İADE FATURASI" : "SATIŞ FATURASI"}
          </p>
          <p className="text-slate-500 text-sm">
            Fatura No: {view?.invoiceNumber || "Gönderimde atanacak"}
          </p>
          <p className="text-slate-600">
            Cari: <span className="font-semibold">{view?.cariAd ?? "-"}</span>
          </p>
          <p className="text-slate-500 text-sm">
            Oluşturma Tarihi:{" "}
            {view?.createdAt
              ? new Date(view.createdAt).toLocaleString("tr-TR")
              : "-"}
          </p>
          {view?.vadeTarihi && (
            <p className="text-slate-500 text-sm">
              Vade: {new Date(view.vadeTarihi).toLocaleDateString("tr-TR")}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">
            KDV Oranı: %{view?.kdvOrani ?? 20}
          </p>
          <p className="text-sm text-slate-500">
            Ara Toplam: {Number(view?.araToplam ?? 0).toFixed(2)} ₺
          </p>
          {Number(view?.genelIskontoTutar ?? 0) > 0 && (
            <p className="text-sm text-amber-700">
              Genel İskonto: -{Number(view?.genelIskontoTutar ?? 0).toFixed(2)} ₺
            </p>
          )}
          <p className="text-sm text-slate-500">
            KDV: {Number(view?.kdvTutar ?? 0).toFixed(2)} ₺
          </p>
          <p className="text-lg font-bold text-orange-600">
            Genel Toplam: {Number(view?.genelToplam ?? 0).toFixed(2)} ₺
          </p>
        </div>
      </div>

      {/* Kalemler Tablosu */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">Kalemler</h2>
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="px-2 py-1 text-left">Ürün</th>
              <th className="px-2 py-1 text-right">Miktar</th>
              <th className="px-2 py-1 text-right">Birim Fiyat</th>
              <th className="px-2 py-1 text-right">Ara Toplam</th>
            </tr>
          </thead>
          <tbody>
            {(view?.kalemler || []).map((k, i) => {
              const miktar = Number(k.miktar || 0);
              const birimFiyat = Number(k.birimFiyat || 0);
              const ara = miktar * birimFiyat;
              return (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="px-2 py-1">{k.urunAd || "-"}</td>
                  <td className="px-2 py-1 text-right">{miktar}</td>
                  <td className="px-2 py-1 text-right">
                    {birimFiyat.toFixed(2)} ₺
                  </td>
                  <td className="px-2 py-1 text-right">
                    {ara.toFixed(2)} ₺
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Not */}
      {(view?.not || "").trim() && (
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Not</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {view.not}
          </p>
        </div>
      )}

      {/* XML Önizleme (açılır/kapanır) */}
      <details className="bg-white rounded-xl shadow">
        <summary className="font-semibold p-4 cursor-pointer list-none">
          XML Önizleme (Demo)
        </summary>
        <p className="text-xs text-slate-500 px-4 pb-2">
          UBL-TR benzeri fatura verisi. Gerçek şema entegratör dokümanına göre güncellenecektir.
        </p>
        <pre className="text-xs bg-slate-900 text-green-200 p-3 rounded-lg overflow-auto max-h-80 mx-4 mb-4">
          {xmlPreview}
        </pre>
      </details>

      {/* Butonlar */}
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <button
          className="btn-gray"
          onClick={() => router.push("/dashboard/efatura/taslaklar")}
        >
          ⬅ Taslaklara Dön
        </button>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="btn-gray"
            onClick={async () => {
              try {
                const token = localStorage.getItem("token");
                const res = await fetch(`/api/efatura/draft-pdf?id=${fatura._id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("PDF alınamadı");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `E-Fatura-Taslak-${fatura._id}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setError(e.message || "PDF indirilemedi");
              }
            }}
          >
            📄 PDF İndir
          </button>
          <button
            className="btn-gray"
            onClick={() =>
              router.push(`/dashboard/efatura/olustur?id=${fatura._id}`)
            }
          >
            ✏️ Taslağı Düzenle
          </button>
          <button
            type="button"
            className="btn-primary bg-blue-600 hover:bg-blue-700"
            onClick={() => handleMailToCustomer(false)}
            disabled={emailSending}
          >
            {emailSending ? "Gönderiliyor..." : "📧 Müşteriye E-posta Gönder"}
          </button>
          <button
            type="button"
            className="btn-primary bg-green-600 hover:bg-green-700"
            onClick={() => handleMailToCustomer(true)}
            disabled={emailSending}
          >
            {emailSending ? "Gönderiliyor..." : "📧 Müşteriye PDF ile Gönder"}
          </button>
          <button
            className="btn-primary bg-orange-600 hover:bg-orange-700"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Gönderiliyor..." : "📤 Entegratöre Gönder (Demo)"}
          </button>
        </div>
      </div>
    </div>
  );
}
