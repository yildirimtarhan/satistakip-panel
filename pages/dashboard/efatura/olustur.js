import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { tutarYazili } from "@/utils/tutarYazili";
import { E_FATURA_KDV_ORANLARI, DEFAULT_KDV_ORANI, gecerliKdvOrani } from "@/lib/efatura/kdvOranlari";

export default function EFaturaOlustur() {
  const router = useRouter();
  const { id: draftId } = router.query;
  const [cariler, setCariler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [selectedCari, setSelectedCari] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [notlar, setNotlar] = useState("");
  const [vadeTarihi, setVadeTarihi] = useState("");
  const [genelIskontoOrani, setGenelIskontoOrani] = useState(0);
  const [company, setCompany] = useState(null);
  const [senaryo, setSenaryo] = useState("TICARI");
  const [faturaTuru, setFaturaTuru] = useState("SATIS");
  const [onizlemeOpen, setOnizlemeOpen] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    fetch("/api/cari", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCariler)
      .catch(console.error);
    fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setUrunler)
      .catch(console.error);
    fetch("/api/settings/company", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCompany)
      .catch(() => setCompany(null));
  }, [token]);

  useEffect(() => {
    if (!draftId || !token || cariler.length === 0 || urunler.length === 0) {
      if (draftId && !loadingDraft) setLoadingDraft(false);
      return;
    }
    setLoadingDraft(true);
    fetch(`/api/efatura/drafts?id=${draftId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Taslak alınamadı")))
      .then((draft) => {
        if (draft.accountId) {
          setSelectedCari(String(draft.accountId));
        } else {
          const cari = cariler.find(
            (c) =>
              (c.ad || c.unvan || "").trim() === (draft.customer?.title || "").trim()
          );
          if (cari) setSelectedCari(String(cari._id));
        }
        setSenaryo(draft.scenario === "TEMEL" ? "TEMEL" : "TICARI");
        setFaturaTuru((draft.invoiceType || draft.tip) === "IADE" ? "IADE" : "SATIS");
        setNotlar(draft.notes || draft.not || "");
        setVadeTarihi(draft.vadeTarihi ? new Date(draft.vadeTarihi).toISOString().slice(0, 10) : "");
        setGenelIskontoOrani(Number(draft.genelIskontoOrani) || 0);
        const rows = (draft.items || []).map((k) => {
          const urun = urunler.find(
            (u) =>
              (k.productId && String(u._id) === String(k.productId)) ||
              (u.name || u.ad || "") === (k.name || "")
          );
          return {
            urunId: urun ? String(urun._id) : (k.productId ? String(k.productId) : ""),
            adet: Number(k.quantity ?? k.miktar ?? 1),
            fiyat: Number(k.price ?? k.birimFiyat ?? 0),
            kdv: gecerliKdvOrani(k.kdvOran ?? k.kdv),
            iskonto: Number(k.iskonto ?? k.iskontoOrani ?? 0),
          };
        });
        setItems(rows.length ? rows : [{ urunId: "", adet: 1, fiyat: 0, kdv: DEFAULT_KDV_ORANI, iskonto: 0 }]);
      })
      .catch(() => alert("Taslak yüklenemedi"))
      .finally(() => setLoadingDraft(false));
  }, [draftId, token, cariler.length, urunler.length]);

  const addRow = () => {
    setItems([...items, { urunId: "", adet: 1, fiyat: 0, kdv: DEFAULT_KDV_ORANI, iskonto: 0 }]);
  };

  const updateRow = (index, key, val) => {
    const newRows = [...items];
    newRows[index][key] = val;

    // Ürün seçilmişse birim fiyatı otomatik çek (Product: name, price; _id string karşılaştır)
    if (key === "urunId") {
      const urun = urunler.find((u) => String(u._id) === String(val));
      if (urun) {
        newRows[index].fiyat = Number(urun.price ?? urun.satisFiyati ?? 0);
        newRows[index].kdv = Number(urun.kdv ?? 20);
      }
    }
    setItems(newRows);
  };

  // Toplamlar: satır iskontosu (%), sonra genel iskonto (%)
  const { araToplam, iskontoTutar, araToplamIskontolu, kdvToplam, genelToplam } = items.reduce(
    (acc, row) => {
      const adet = Number(row.adet) || 0;
      const fiyat = Number(row.fiyat) || 0;
      const kdvOran = Number(row.kdv) || 0;
      const satirIskonto = Number(row.iskonto) || 0;
      let net = adet * fiyat;
      const satirIskontoTutar = (net * satirIskonto) / 100;
      net -= satirIskontoTutar;
      const kdvTutar = (net * kdvOran) / 100;
      acc.araToplam += net + satirIskontoTutar;
      acc.iskontoTutar += satirIskontoTutar;
      acc.araToplamIskontolu += net;
      acc.kdvToplam += kdvTutar;
      acc.genelToplam += net + kdvTutar;
      return acc;
    },
    { araToplam: 0, iskontoTutar: 0, araToplamIskontolu: 0, kdvToplam: 0, genelToplam: 0 }
  );
  const genelIskontoTutar = (genelToplam * Number(genelIskontoOrani || 0)) / 100;
  const genelToplamSon = genelToplam - genelIskontoTutar;
  const tutarYaziliMetin = tutarYazili(genelToplamSon);

  const selectedCariObj = cariler.find((c) => String(c._id) === String(selectedCari));

  const faturaOlustur = async () => {
    if (!selectedCari || !selectedCariObj) return alert("Cari seçin");
    if (items.length === 0) return alert("En az 1 ürün ekleyin");

    setLoading(true);
    try {
      const customer = {
        title: selectedCariObj.ad || selectedCariObj.unvan || "Cari",
        email: selectedCariObj.email || selectedCariObj.eposta || "",
        vknTckn: selectedCariObj.vergiNo || "",
        identifier: selectedCariObj.vergiNo || "",
        vergiDairesi: selectedCariObj.vergiDairesi || "",
        adres: selectedCariObj.adres || "",
      };
      const draftItems = items.map((row) => {
        const urun = urunler.find((u) => String(u._id) === String(row.urunId));
        const qty = Number(row.adet) || 1;
        const price = Number(row.fiyat) || 0;
        const kdvOran = gecerliKdvOrani(row.kdv);
        const iskontoOrani = Number(row.iskonto) || 0;
        let net = qty * price;
        if (iskontoOrani > 0) net -= (net * iskontoOrani) / 100;
        return {
          quantity: qty,
          price,
          total: net,
          kdvOran,
          iskonto: iskontoOrani,
          iskontoOrani: iskontoOrani,
          name: urun?.name || urun?.ad || "Ürün",
          productId: row.urunId ? String(row.urunId) : undefined,
        };
      });
      const payload = {
        customer,
        accountId: selectedCari ? String(selectedCari) : undefined,
        items: draftItems,
        notes: notlar || "",
        invoiceType: faturaTuru === "IADE" ? "IADE" : "EARSIV",
        scenario: senaryo,
        totals: { subtotal: araToplamIskontolu, total: genelToplamSon },
        vadeTarihi: vadeTarihi || undefined,
        genelIskontoOrani: Number(genelIskontoOrani) || 0,
        genelIskontoTutar: genelIskontoTutar,
      };
      const url = draftId
        ? `/api/efatura/drafts?id=${draftId}`
        : "/api/efatura/drafts";
      const res = await fetch(url, {
        method: draftId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        alert(draftId ? "Taslak güncellendi." : "Fatura taslak olarak oluşturuldu. Göndermek için Taslak Faturalar sayfasından \"Gönder\" kullanın.");
        window.location.href = "/dashboard/efatura/taslak";
      } else {
        alert("Hata: " + (data.message || "Taslak kaydedilemedi"));
      }
    } catch (e) {
      alert("Hata: " + (e.message || "Taslak kaydedilemedi"));
    } finally {
      setLoading(false);
    }
  };

  const createXML = async () => {
    if (!selectedCari) return alert("Cari seçin");
    if (items.length === 0) return alert("En az 1 ürün ekleyin");

    setLoading(true);

    const payload = {
      cariId: selectedCari,
      items: items.map((row) => ({
        productId: row.urunId,
        adet: row.adet,
        fiyat: row.fiyat,
        kdv: row.kdv,
      })),
    };
    const res = await fetch("/api/efatura/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("XML oluşturuldu!");
      window.open(data.fileUrl, "_blank");
    } else {
      alert("Hata: " + data.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 text-center">
        📄 E-Fatura Oluştur
      </h1>

      {/* Cari seçimi */}
      <div className="bg-white p-4 rounded-xl shadow">
        <label className="font-semibold">Cari Seç</label>
        <select
          className="input mt-1"
          value={selectedCari}
          onChange={(e) => setSelectedCari(e.target.value)}
        >
          <option value="">Seçiniz...</option>
          {cariler.map((c) => (
            <option key={c._id} value={c._id}>
              {c.ad} ({c.vergiTipi}:{c.vergiNo}) {c.email || c.eposta ? `– ${c.email || c.eposta}` : ""}
            </option>
          ))}
        </select>
        {selectedCariObj && (selectedCariObj.email || selectedCariObj.eposta) && (
          <p className="text-xs text-green-600 mt-1">Müşteri e-posta: {selectedCariObj.email || selectedCariObj.eposta}</p>
        )}
      </div>

      {/* Fatura numarası bilgisi */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600">
        <strong>Fatura numarası:</strong> Taslağı gönderdiğinizde otomatik atanır (format: <code className="bg-white px-1 rounded">FT2026-00001</code>). Her yıl 1’den başlayan sıralı numara kullanılır.
      </div>

      {/* Fatura senaryosu (Ticari / Temel) ve Fatura türü (Satış / İade) */}
      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Fatura senaryosu</label>
          <select
            className="input mt-1 w-full"
            value={senaryo}
            onChange={(e) => setSenaryo(e.target.value)}
          >
            <option value="TICARI">Ticari Fatura</option>
            <option value="TEMEL">Temel Fatura</option>
          </select>
        </div>
        <div>
          <label className="font-semibold">Fatura türü</label>
          <select
            className="input mt-1 w-full"
            value={faturaTuru}
            onChange={(e) => setFaturaTuru(e.target.value)}
          >
            <option value="SATIS">Satış</option>
            <option value="IADE">İade Faturası</option>
          </select>
        </div>
      </div>

      {/* Vade & İskonto */}
      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Vade Tarihi</label>
          <input
            type="date"
            className="input mt-1 w-full"
            value={vadeTarihi}
            onChange={(e) => setVadeTarihi(e.target.value)}
          />
        </div>
        <div>
          <label className="font-semibold">Genel İskonto (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className="input mt-1 w-full"
            value={genelIskontoOrani}
            onChange={(e) => setGenelIskontoOrani(e.target.value)}
          />
          {Number(genelIskontoOrani) > 0 && (
            <p className="text-xs text-slate-500 mt-1">İskonto tutarı: ₺{genelIskontoTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
          )}
        </div>
      </div>

      {/* Ürün satırları */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between mb-3">
          <div className="font-semibold">Ürünler</div>
          <button onClick={addRow} className="btn-primary">➕ Satır Ekle</button>
        </div>

        {/* Başlık satırı: Ürün, Adet, Fiyat, İskonto %, KDV, Sil */}
        <div className="grid grid-cols-12 gap-2 p-2 border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600">
          <div className="col-span-4">Ürün</div>
          <div className="col-span-1 text-right">Adet</div>
          <div className="col-span-2 text-right">Fiyat</div>
          <div className="col-span-1 text-right">İskonto %</div>
          <div className="col-span-2 text-right">KDV %</div>
          <div className="col-span-1"></div>
        </div>
        {items.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 p-2 border-b border-slate-200"
          >
            {/* Ürün */}
            <select
              className="input col-span-4"
              value={row.urunId}
              onChange={(e) => updateRow(i, "urunId", e.target.value)}
            >
              <option value="">Ürün seç…</option>
              {urunler.map((u) => (
                <option key={u._id} value={String(u._id)}>
                  {u.name || u.ad || "-"}
                </option>
              ))}
            </select>

            {/* Adet */}
            <input
              type="number"
              min={1}
              className="input col-span-1 text-right"
              value={row.adet}
              onChange={(e) => updateRow(i, "adet", e.target.value)}
            />

            {/* Fiyat */}
            <input
              type="number"
              step={0.01}
              className="input col-span-2 text-right"
              value={row.fiyat}
              onChange={(e) => updateRow(i, "fiyat", e.target.value)}
            />

            {/* İskonto % */}
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input col-span-1 text-right"
              placeholder="0"
              value={row.iskonto ?? ""}
              onChange={(e) => updateRow(i, "iskonto", e.target.value)}
            />

            {/* KDV % – E-fatura oranlarından seçim */}
            <select
              className="input col-span-2 text-right"
              value={E_FATURA_KDV_ORANLARI.includes(Number(row.kdv)) ? row.kdv : DEFAULT_KDV_ORANI}
              onChange={(e) => updateRow(i, "kdv", Number(e.target.value))}
            >
              {E_FATURA_KDV_ORANLARI.map((oran) => (
                <option key={oran} value={oran}>%{oran}</option>
              ))}
            </select>

            {/* Sil */}
            <button
              onClick={() => setItems(items.filter((_, x) => x !== i))}
              className="text-red-600 col-span-1"
              type="button"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Toplamlar – İskonto KDV'den önce */}
      {items.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow max-w-md ml-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Ara Toplam</span>
              <span>₺{araToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(genelIskontoOrani) > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Genel İskonto (%{genelIskontoOrani})</span>
                <span>-₺{genelIskontoTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>KDV Toplamı</span>
              <span>₺{kdvToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Genel Toplam</span>
              <span>₺{genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
              <span>Ödenecek Tutar</span>
              <span className="text-orange-600">₺{genelToplamSon.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Fatura Oluştur + Önizleme + XML İndir */}
      {(loadingDraft && draftId) && <div className="text-center text-slate-500">Taslak yükleniyor...</div>}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={faturaOlustur}
          disabled={loading || (!!draftId && loadingDraft)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition disabled:opacity-70"
        >
          {loading ? "İşleniyor..." : draftId ? "🧾 Taslağı Güncelle" : "🧾 Fatura Oluştur"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!selectedCari && items.length === 0) {
              alert("Önizleme için en az cari seçin ve bir ürün ekleyin.");
              return;
            }
            if (items.length === 0) {
              alert("En az bir ürün satırı ekleyin.");
              return;
            }
            setOnizlemeOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl shadow transition"
        >
          👁️ Önizleme
        </button>
        <button
          onClick={createXML}
          disabled={loading}
          className="btn-primary px-6 py-3 disabled:opacity-70"
        >
          {loading ? "İşleniyor..." : "📄 XML İndir"}
        </button>
      </div>
      <p className="text-center text-sm text-slate-500 mt-2">
        <strong>Fatura Oluştur</strong> taslak kaydeder; göndermek için Taslak Faturalar sayfasından &quot;Gönder&quot; kullanın. <strong>Önizleme</strong> ile kaydetmeden faturanın görünümünü kontrol edebilirsiniz. <strong>XML İndir</strong> yalnızca XML dosyasını indirir.
      </p>

      {/* Önizleme modal */}
      {onizlemeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOnizlemeOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-orange-600">🧾 Fatura Önizleme</h2>
              <button type="button" className="text-slate-500 hover:text-slate-700 text-2xl leading-none" onClick={() => setOnizlemeOpen(false)}>×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">{faturaTuru === "IADE" ? "İADE FATURASI" : "SATIŞ FATURASI"}</p>
                  <p className="text-slate-600">Senaryo: {senaryo === "TEMEL" ? "Temel" : "Ticari"}</p>
                  <p className="text-slate-600">Cari: {selectedCariObj ? (selectedCariObj.ad || selectedCariObj.unvan || "-") : "-"}</p>
                  <p className="text-slate-500">Tarih: {new Date().toLocaleDateString("tr-TR")}</p>
                  {vadeTarihi && <p className="text-slate-500">Vade: {new Date(vadeTarihi).toLocaleDateString("tr-TR")}</p>}
                </div>
                <div className="text-right">
                  <p className="text-slate-600">Ara Toplam: ₺{araToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                  {Number(genelIskontoOrani) > 0 && (
                    <p className="text-amber-700">Genel İskonto: -₺{genelIskontoTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                  )}
                  <p className="text-slate-600">KDV: ₺{kdvToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                  <p className="font-bold text-orange-600">Genel Toplam: ₺{genelToplamSon.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <table className="w-full border border-slate-200">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Ürün</th>
                    <th className="px-2 py-1 text-right">Miktar</th>
                    <th className="px-2 py-1 text-right">Birim Fiyat</th>
                    <th className="px-2 py-1 text-right">İskonto %</th>
                    <th className="px-2 py-1 text-right">Ara Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const urun = urunler.find((u) => String(u._id) === String(row.urunId));
                    const adet = Number(row.adet) || 0;
                    const fiyat = Number(row.fiyat) || 0;
                    const iskonto = Number(row.iskonto) || 0;
                    let ara = adet * fiyat;
                    if (iskonto > 0) ara -= (ara * iskonto) / 100;
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-2 py-1">{urun ? (urun.name || urun.ad || "-") : "-"}</td>
                        <td className="px-2 py-1 text-right">{adet}</td>
                        <td className="px-2 py-1 text-right">₺{fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right">{iskonto > 0 ? "%" + iskonto : "-"}</td>
                        <td className="px-2 py-1 text-right">₺{ara.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {notlar && <p className="text-slate-600"><strong>Not:</strong> {notlar}</p>}
              <p className="text-xs text-slate-500">Taslak kaydettiğinizde PDF’te firma logosu ve imzası (E-Fatura Başvuru / Firma Ayarları’nda yüklüyse) görünür.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
