import axios from "axios";

/**
 * Taxten API'den taslak fatura listesini çeker.
 * Taxten dokümantasyonundaki "Taslak Listele" endpoint'ine göre path güncellenebilir.
 * @param {{ baseUrl: string, headers: Record<string,string> }} opts
 * @returns {Promise<Array>} Taslak listesi (Taxten ham formatında)
 */
export async function fetchTaxtenDrafts(opts) {
  const { baseUrl, headers } = opts;
  const endpointsToTry = [
    "/Invoice/Drafts",
    "/Draft/List",
    "/Invoice/GetDraftList",
  ];
  for (const path of endpointsToTry) {
    try {
      const res = await axios.get(`${baseUrl}${path}`, {
        headers: { ...headers, "Content-Type": "application/json" },
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status === 404) continue;
      const data = res.data || {};
      if (res.status >= 400) {
        throw new Error(data.message || data.Message || `HTTP ${res.status}`);
      }
      // Yaygın response formatları: { data: [] }, { list: [] }, { List: [] }, []
      const list = Array.isArray(data)
        ? data
        : data?.data ?? data?.list ?? data?.List ?? data?.items ?? [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      if (endpointsToTry.indexOf(path) < endpointsToTry.length - 1) continue;
      throw e;
    }
  }
  return [];
}

/**
 * Taxten taslak kaydını bizim efatura_drafts şemasına map eder.
 * Taxten alan adları dokümana göre güncellenebilir.
 */
export function mapTaxtenDraftToOurs(taxtenItem) {
  const ettn = taxtenItem.ettn ?? taxtenItem.ETTN ?? taxtenItem.Id ?? "";
  const receiverTitle =
    taxtenItem.receiverTitle ??
    taxtenItem.ReceiverTitle ??
    taxtenItem.Alıcı ??
    taxtenItem.buyerName ??
    "";
  const receiverVkn =
    taxtenItem.receiverVkn ??
    taxtenItem.ReceiverVkn ??
    taxtenItem.VKN ??
    taxtenItem.buyerVkn ??
    "";
  const total =
    taxtenItem.totalAmount ??
    taxtenItem.TotalAmount ??
    taxtenItem.Tutar ??
    taxtenItem.total ??
    0;
  const lines =
    taxtenItem.lines ??
    taxtenItem.Lines ??
    taxtenItem.items ??
    taxtenItem.LineItems ??
    [];
  const items = Array.isArray(lines)
    ? lines.map((l) => ({
        name: l.name ?? l.Name ?? l.MalHizmet ?? l.description ?? "-",
        quantity: Number(l.quantity ?? l.Quantity ?? l.Miktar ?? 1),
        price: Number(l.unitPrice ?? l.UnitPrice ?? l.BirimFiyat ?? l.price ?? 0),
        total: Number(l.amount ?? l.Amount ?? l.MalHizmetTutari ?? 0),
        kdvOran: Number(l.vatRate ?? l.KdvOrani ?? l.VatRate ?? 20),
      }))
    : [];
  const scenario =
    (taxtenItem.scenario ?? taxtenItem.Scenario ?? "").toString().toUpperCase();
  const invoiceType =
    (taxtenItem.invoiceType ?? taxtenItem.FaturaTipi ?? taxtenItem.InvoiceType ?? "SATIS").toString().toUpperCase();
  const issueDate =
    taxtenItem.issueDate ?? taxtenItem.FaturaTarihi ?? taxtenItem.IssueDate ?? taxtenItem.updateDate;
  return {
    uuid: ettn || `taxten-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    customer: {
      title: receiverTitle || "Taxten Alıcı",
      vknTckn: String(receiverVkn).replace(/\D/g, "").slice(0, 11),
      identifier: String(receiverVkn).replace(/\D/g, "").slice(0, 11),
      email: taxtenItem.receiverEmail ?? taxtenItem.ReceiverEmail ?? "",
    },
    items: items.length ? items : [{ name: "Kalem", quantity: 1, price: Number(total) || 0, total: Number(total) || 0, kdvOran: 20 }],
    totals: { subtotal: Number(total) || 0, total: Number(total) || 0 },
    invoiceType: invoiceType === "IADE" ? "IADE" : "EARSIV",
    scenario: scenario.includes("TEMEL") ? "TEMEL" : "TICARI",
    invoiceNumber: taxtenItem.invoiceNumber ?? taxtenItem.FaturaNo ?? taxtenItem.InvoiceNumber ?? "",
    issueDate: issueDate ? new Date(issueDate).toISOString().slice(0, 10) : undefined,
    notes: taxtenItem.notes ?? taxtenItem.Not ?? "",
    taxtenEttn: ettn || undefined,
    source: "taxten",
  };
}
