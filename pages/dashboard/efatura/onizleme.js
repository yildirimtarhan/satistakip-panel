// 📄 /pages/dashboard/efatura/onizleme.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function EFaturaOnizleme() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fatura, setFatura] = useState(null);
  const [error, setError] = useState("");

  // Basit XML string üretici (şimdilik demo amaçlı)
  const buildXml = (draft) => {
    if (!draft) return "";

    const issueDate = new Date(draft.createdAt || Date.now())
      .toISOString()
      .substring(0, 10);

    const linesXml =
      (draft.kalemler || [])
        .map((k, i) => {
          const miktar = Number(k.miktar || 0);
          const birimFiyat = Number(k.birimFiyat || 0);
          const kdvOran = Number(draft.kdvOrani || 20);
          const araToplam = miktar * birimFiyat;
          const kdvTutar = (araToplam * kdvOran) / 100;
          const toplam = araToplam + kdvTutar;

          return `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity>${miktar}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="TRY">${araToplam.toFixed(
        2
      )}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${k.urunAd || ""}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="TRY">${birimFiyat.toFixed(
          2
        )}</cbc:PriceAmount>
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
  <cbc:InvoiceTypeCode>${
    draft.tip === "IADE" ? "381" : "380"
  }</cbc:InvoiceTypeCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:Name>Kurumsal Tedarikçi</cbc:Name>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:Name>${draft.cariAd || "Müşteri"}</cbc:Name>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="TRY">${Number(
      draft.genelToplam || 0
    ).toFixed(2)}</cbc:PayableAmount>
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
    alert("Şimdilik sadece önizleme var. Entegratör API'si geldiğinde bu butonu aktif edeceğiz.");
    // ADIM 5.2'de /api/efatura/send ile bağlayacağız.
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

  const araToplam = (fatura.kalemler || []).reduce((sum, k) => {
    const miktar = Number(k.miktar || 0);
    const birimFiyat = Number(k.birimFiyat || 0);
    return sum + miktar * birimFiyat;
  }, 0);

  const kdvTutar = araToplam * Number(fatura.kdvOrani || 0) / 100;
  const genelToplam = Number(fatura.genelToplam || araToplam + kdvTutar);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        🧾 E-Fatura Önizleme
      </h1>

      {/* Başlık ve Cari Bilgisi */}
      <div className="bg-white p-4 rounded-xl shadow flex justify-between gap-4">
        <div>
          <p className="font-semibold text-lg">
            {fatura.tip === "IADE" ? "İADE FATURASI" : "SATIŞ FATURASI"}
          </p>
          <p className="text-slate-600">
            Cari: <span className="font-semibold">{fatura.cariAd || "-"}</span>
          </p>
          <p className="text-slate-500 text-sm">
            Oluşturma Tarihi:{" "}
            {fatura.createdAt
              ? new Date(fatura.createdAt).toLocaleString("tr-TR")
              : "-"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">
            KDV Oranı: %{fatura.kdvOrani ?? 20}
          </p>
          <p className="text-sm text-slate-500">
            Ara Toplam: {araToplam.toFixed(2)} ₺
          </p>
          <p className="text-sm text-slate-500">
            KDV: {kdvTutar.toFixed(2)} ₺
          </p>
          <p className="text-lg font-bold text-orange-600">
            Genel Toplam: {genelToplam.toFixed(2)} ₺
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
            {(fatura.kalemler || []).map((k, i) => {
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
      {fatura.not && (
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Not</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {fatura.not}
          </p>
        </div>
      )}

      {/* XML Önizleme */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">XML Önizleme (Demo)</h2>
        <p className="text-xs text-slate-500 mb-2">
          Bu yapı özel entegratör tarafına gidecek UBL-TR benzeri fatura
          verisinin sadeleştirilmiş bir örneğidir. Gerçek şema, entegratör
          dokümanına göre güncellenecek.
        </p>
        <pre className="text-xs bg-slate-900 text-green-200 p-3 rounded-lg overflow-auto max-h-80">
{xmlPreview}
        </pre>
      </div>

      {/* Butonlar */}
      <div className="flex justify-between gap-2">
        <button
          className="btn-gray"
          onClick={() => router.push("/dashboard/efatura/taslaklar")}
        >
          ⬅ Taslaklara Dön
        </button>

        <div className="flex gap-2">
          <button
            className="btn-gray"
            onClick={() =>
              router.push(`/dashboard/efatura/yeni?id=${fatura._id}`)
            }
          >
            ✏️ Taslağı Düzenle
          </button>

          <button
            className="btn-primary bg-green-600 hover:bg-green-700"
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
