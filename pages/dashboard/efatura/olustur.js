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
  const [aciklama, setAciklama] = useState("");
  const [vadeTarihi, setVadeTarihi] = useState("");
  const [siparisNo, setSiparisNo] = useState("");
  const [platform, setPlatform] = useState("");
  const [odemeYontemi, setOdemeYontemi] = useState("");
  const [company, setCompany] = useState(null);
  const [senaryo, setSenaryo] = useState("TICARI");
  const [faturaTuru, setFaturaTuru] = useState("SATIS");
  const [paraBirimi, setParaBirimi] = useState("TRY");
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
        setParaBirimi(draft.paraBirimi || "TRY");
        setNotlar(draft.notlar ?? draft.notes ?? draft.not ?? "");
        setAciklama(draft.aciklama ?? "");
        setVadeTarihi(draft.vadeTarihi ? new Date(draft.vadeTarihi).toISOString().slice(0, 10) : "");
        setSiparisNo(draft.siparisNo ?? draft.orderNumber ?? "");
        setPlatform(draft.platform ?? "");
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
            aciklama: k.aciklama ?? k.description ?? "",
          };
        });
        setItems(rows.length ? rows : [{ urunId: "", adet: 1, fiyat: 0, kdv: DEFAULT_KDV_ORANI, iskonto: 0, aciklama: "" }]);
      })
      .catch(() => alert("Taslak yüklenemedi"))
      .finally(() => setLoadingDraft(false));
  }, [draftId, token, cariler.length, urunler.length]);

  const addRow = () => {
    setItems([...items, { urunId: "", adet: 1, fiyat: 0, kdv: DEFAULT_KDV_ORANI, iskonto: 0, aciklama: "" }]);
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
  const tutarYaziliMetin = tutarYazili(genelToplam);

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
          aciklama: row.aciklama || "",
          description: row.aciklama || "",
          productId: row.urunId ? String(row.urunId) : undefined,
        };
      });
      const payload = {
        customer,
        accountId: selectedCari ? String(selectedCari) : undefined,
        items: draftItems,
        notes: [aciklama, notlar].filter(Boolean).join("\n\n"),
        aciklama: aciklama || undefined,
        notlar: notlar || undefined,
        invoiceType: faturaTuru === "IADE" ? "IADE" : "EARSIV",
        scenario: senaryo,
        paraBirimi: paraBirimi || "TRY",
        totals: { subtotal: araToplamIskontolu, total: genelToplam },
        vadeTarihi: vadeTarihi || undefined,
        siparisNo: siparisNo?.trim() || undefined,
        platform: platform?.trim() || undefined,
        odemeYontemi: odemeYontemi?.trim() || undefined,
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

      {/* Fatura senaryosu, türü ve para birimi */}
      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <label className="font-semibold">Para Birimi</label>
          <select
            className="input mt-1 w-full"
            value={paraBirimi}
            onChange={(e) => setParaBirimi(e.target.value)}
          >
            <option value="TRY">TL - Türk Lirası</option>
            <option value="USD">USD - Amerikan Doları</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
      </div>

      {/* Vade, Sipariş, Platform & Açıklama / Notlar */}
      <div className="bg-white p-4 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="font-semibold">Sipariş No (opsiyonel)</label>
            <input
              type="text"
              className="input mt-1 w-full"
              placeholder="Örn: S-2026-001"
              value={siparisNo}
              onChange={(e) => setSiparisNo(e.target.value)}
            />
          </div>
          <div>
            <label className="font-semibold">Platform (opsiyonel)</label>
            <select
              className="input mt-1 w-full"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="">Seçiniz...</option>
              <optgroup label="Pazaryerleri">
                <option value="Trendyol">Trendyol</option>
                <option value="Hepsiburada">Hepsiburada</option>
                <option value="N11">N11</option>
                <option value="Pazarama">Pazarama</option>
                <option value="Amazon">Amazon</option>
                <option value="eBay">eBay</option>
                <option value="Çiçeksepeti">Çiçeksepeti</option>
                <option value="GittiGidiyor">GittiGidiyor</option>
              </optgroup>
              <optgroup label="Kurumsal">
                <option value="Kurumsal Tedarikçi">Kurumsal Tedarikçi</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="font-semibold">Ödeme Yöntemi (opsiyonel)</label>
            <select
              className="input mt-1 w-full"
              value={odemeYontemi}
              onChange={(e) => setOdemeYontemi(e.target.value)}
            >
              <option value="">Seçiniz...</option>
              <option value="Kredi Kartı">Kredi Kartı</option>
              <option value="Açık Hesap">Açık Hesap</option>
              <option value="Banka">Banka</option>
              <option value="Platform Öder">Platform Öder</option>
            </select>
          </div>
        </div>
        <div>
          <label className="font-semibold">Açıklama</label>
          <textarea
            className="input mt-1 w-full min-h-[60px]"
            placeholder="Fatura açıklaması (opsiyonel)"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
          />
        </div>
        <div>
          <label className="font-semibold">Notlar</label>
          <textarea
            className="input mt-1 w-full min-h-[60px]"
            placeholder="Fatura notları (opsiyonel)"
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
          />
        </div>
      </div>

      {/* Ürün satırları */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between mb-3">
          <div className="font-semibold">Ürünler</div>
          <button onClick={addRow} className="btn-primary">➕ Satır Ekle</button>
        </div>

        {/* Başlık satırı: Ürün, Adet, Fiyat, Diğer İskonto %, KDV, Açıklama, Sil */}
        <div className="grid grid-cols-12 gap-2 p-2 border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600">
          <div className="col-span-3">Ürün</div>
          <div className="col-span-1 text-right">Adet</div>
          <div className="col-span-2 text-right">Fiyat</div>
          <div className="col-span-1 text-right">İskonto %</div>
          <div className="col-span-2 text-right">KDV %</div>
          <div className="col-span-2">Açıklama</div>
          <div className="col-span-1"></div>
        </div>
        {items.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 p-2 border-b border-slate-200"
          >
            {/* Ürün */}
            <select
              className="input col-span-3"
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

            {/* Diğer İskonto % (satır bazlı) */}
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input col-span-1 text-right"
              placeholder="0"
              value={row.iskonto ?? ""}
              onChange={(e) => updateRow(i, "iskonto", e.target.value)}
              title="Satır iskontosu"
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

            {/* Açıklama (satır) */}
            <input
              type="text"
              className="input col-span-2"
              placeholder="Satır açıklaması"
              value={row.aciklama ?? ""}
              onChange={(e) => updateRow(i, "aciklama", e.target.value)}
            />

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

      {/* Toplamlar – Satır iskontosu KDV'den önce uygulanır */}
      {items.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow max-w-md ml-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Ara Toplam (İskontolu)</span>
              <span>₺{araToplamIskontolu.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            {iskontoTutar > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Satır İskontoları</span>
                <span>-₺{iskontoTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>KDV Toplamı</span>
              <span>₺{kdvToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
              <span>Ödenecek Tutar</span>
              <span className="text-orange-600">₺{genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
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

      {onizlemeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => setOnizlemeOpen(false)}>
          <div className="bg-white shadow-xl max-w-[800px] w-full my-8 p-0" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                <span className="text-2xl">👁️</span> Hızlı Önizleme (GİB Şablonu İşlemesiz)
              </h2>
              <button type="button" className="text-slate-500 hover:text-slate-700 text-3xl leading-none" onClick={() => setOnizlemeOpen(false)}>&times;</button>
            </div>
            
            {/* Fatura A4 Alanı (XSLT Simülasyonu) */}
            <div className="p-8 bg-white min-h-[1000px] flex flex-col font-sans" style={{ color: "#000", fontSize: "12px", border: "1px solid #ccc" }}>
              
              {/* Header: Logolar ve E-Fatura Başlığı */}
              <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-4">
                {/* Sol Alan: Firma Logosu */}
                <div className="w-1/3 flex justify-start">
                  <div className="w-32 h-20 text-center text-gray-400 text-[10px] italic border border-dashed border-gray-300 p-2 flex items-center justify-center">
                     Firma Logosu (XSLT)
                  </div>
                </div>

                {/* Orta Alan: GİB Logosu, e-Fatura yazısı, İmza */}
                <div className="w-1/3 flex flex-col items-center gap-2">
                  {/* GIB Logo */}
                  <div className="w-20 h-20 rounded-full border-2 border-blue-600 flex items-center justify-center flex-col shadow-sm bg-white z-10">
                     <span className="text-[8px] font-bold text-blue-700 leading-tight tracking-tighter">GELİR İDARESİ</span>
                     <span className="text-[8px] font-bold text-blue-700 leading-tight tracking-tighter">BAŞKANLIĞI</span>
                     <span className="text-xs font-bold text-red-600 mt-1 uppercase">GİB</span>
                  </div>
                  {/* e-Fatura Yazısı */}
                  <h1 className="text-xl font-bold text-blue-800 tracking-wider uppercase m-0 leading-none">e-Fatura</h1>
                  <span className="text-[9px] font-semibold text-gray-500 tracking-wide border-t border-gray-300 w-16 text-center pt-1 mt-1">İmza / Kaşe</span>
                </div>

                {/* Sağ Alan: Senaryo Özeti (İsteğe Bağlı) */}
                <div className="w-1/3 flex flex-col items-end pt-2">
                   <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                     {senaryo === "TEMEL" ? "TEMEL FATURA" : "TİCARİ FATURA"}
                   </div>
                </div>
              </div>

              {/* Grid 1: SATICI VE ALICI BİLGİLERİ */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                
                {/* Sol Kısım: Satıcı (Kendi Firmanız) */}
                <div className="border border-blue-300">
                  <div className="bg-blue-600 text-white font-bold p-1 text-xs uppercase tracking-wider text-center">Satıcı Bilgileri</div>
                  <div className="p-2 space-y-2 text-[11px] leading-tight">
                    <p className="font-bold text-[13px]">{company?.companyName || "BENİM FİRMAM A.Ş."}</p>
                    <p>{company?.address || "Merkez Mah. Fatura Sk. No:1"}</p>
                    <p>{company?.district || "Merkez"} / {company?.city || "İstanbul"}</p>
                    <p>{company?.taxOffice || "Merkez"} V.D. - VKN: {company?.taxNumber || "1111111111"}</p>
                    {company?.phone && <p>Tel: {company?.phone}</p>}
                    {company?.email && <p>E-Posta: {company?.email}</p>}
                    <p>Web Sitesi: {company?.website || "-"}</p>
                  </div>
                </div>

                {/* Sağ Kısım: Alıcı (Müşteri) & Fatura Bilgileri */}
                <div className="flex flex-col gap-4">
                  {/* Fatura Temel Bilgileri */}
                  <div className="border border-blue-300">
                    <div className="bg-blue-600 text-white font-bold p-1 text-xs uppercase tracking-wider text-center">Fatura Bilgileri</div>
                    <div className="p-2 space-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="font-semibold">Özelleştirme No:</span><span>TR1.2</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Senaryo:</span><span>{senaryo === "TEMEL" ? "TEMEL FATURA" : "TİCARİ FATURA"}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Fatura Tipi:</span><span>{faturaTuru === "IADE" ? "İADE" : "SATIŞ"}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Fatura No:</span><span className="italic text-gray-500">Gönderimde Atanacak</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Fatura Tarihi:</span><span>{new Date().toLocaleDateString("tr-TR")}</span></div>
                      {vadeTarihi && <div className="flex justify-between"><span className="font-semibold">Ödeme Vadesi:</span><span>{new Date(vadeTarihi).toLocaleDateString("tr-TR")}</span></div>}
                    </div>
                  </div>

                  {/* Alıcı */}
                  <div className="border border-blue-300">
                    <div className="bg-blue-600 text-white font-bold p-1 text-xs uppercase tracking-wider text-center">Sayın (Alıcı)</div>
                    <div className="p-2 space-y-1 text-[11px] leading-tight flex-1">
                      <p className="font-bold text-[13px]">{selectedCariObj ? (selectedCariObj.ad || selectedCariObj.unvan || "-") : "-"}</p>
                      <p>{selectedCariObj?.adres || "-"}</p>
                      {selectedCariObj?.ilce || selectedCariObj?.sehir ? <p>{selectedCariObj?.ilce || "-"} / {selectedCariObj?.sehir || "-"}</p> : null}
                      <p>{selectedCariObj?.vergiDairesi || "-"} V.D. - VKN/TCKN: {selectedCariObj?.vergiNo || "-"}</p>
                      {selectedCariObj?.email && <p>E-Posta: {selectedCariObj.email}</p>}
                      {selectedCariObj?.telefon && <p>Tel: {selectedCariObj.telefon}</p>}
                    </div>
                  </div>
                </div>

              </div>

              {/* Kalemler Tablosu Tablosu */}
              <div className="mb-6 flex-1">
                <table className="w-full border-collapse" style={{ borderColor: "#60a5fa" }}>
                  <thead>
                    <tr className="bg-blue-600 text-white text-[10px] uppercase">
                      <th className="border border-blue-400 p-1 text-center w-8">Sıra</th>
                      <th className="border border-blue-400 p-1 text-left">Mal ve Hizmet</th>
                      <th className="border border-blue-400 p-1 text-center">Miktar</th>
                      <th className="border border-blue-400 p-1 text-right">Birim Fiyat</th>
                      <th className="border border-blue-400 p-1 text-right">İskonto %</th>
                      <th className="border border-blue-400 p-1 text-right">KDV %</th>
                      <th className="border border-blue-400 p-1 text-right">Mal Hizmet Tutarı</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {items.map((row, i) => {
                      const urun = urunler.find((u) => String(u._id) === String(row.urunId));
                      const adet = Number(row.adet) || 0;
                      const fiyat = Number(row.fiyat) || 0;
                      const iskonto = Number(row.iskonto) || 0;
                      let ara = adet * fiyat;
                      if (iskonto > 0) ara -= (ara * iskonto) / 100;

                      return (
                        <tr key={i} className="even:bg-blue-50/50">
                          <td className="border border-blue-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-blue-300 p-1 font-semibold">{urun ? (urun.name || urun.ad || "-") : "-"}
                            {row.aciklama && <div className="text-[9px] text-gray-500 font-normal mt-0.5">{row.aciklama}</div>}
                          </td>
                          <td className="border border-blue-300 p-1 text-center">{adet} {urun?.birim || "Adet"}</td>
                          <td className="border border-blue-300 p-1 text-right">{fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                          <td className="border border-blue-300 p-1 text-right">{iskonto > 0 ? iskonto : "-"}</td>
                          <td className="border border-blue-300 p-1 text-right">{row.kdv}</td>
                          <td className="border border-blue-300 p-1 text-right font-semibold">{ara.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alt Kısım: Notlar/Yazı İle ve Toplamlar */}
              <div className="grid grid-cols-2 gap-8 mt-auto pt-4 relative">
                
                {/* Yazı İle / Açıklamalar */}
                <div className="text-[11px] space-y-4">
                  <div>
                    <span className="font-bold border-b border-gray-400 tracking-wider">AÇIKLAMALAR</span>
                    {(aciklama || notlar) ? (
                      <div className="mt-2 text-gray-700 whitespace-pre-wrap">
                        {aciklama && <p>{aciklama}</p>}
                        {notlar && <p className="mt-1">{notlar}</p>}
                      </div>
                    ) : (
                      <p className="mt-2 text-gray-500 italic">Açıklama bulunmuyor.</p>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">YALNIZ: </span>
                    <span className="uppercase">{tutarYaziliMetin}</span>
                  </div>
                </div>

                {/* Toplamlar Tablosu */}
                <div className="flex justify-end">
                  <table className="w-full max-w-[280px] text-[11px] border-collapse">
                    <tbody>
                      <tr>
                        <td className="border border-blue-300 p-1 font-semibold text-gray-700">Mal Hizmet Toplam Tutarı</td>
                        <td className="border border-blue-300 p-1 text-right w-28">{(araToplamIskontolu + iskontoTutar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                      </tr>
                      <tr>
                        <td className="border border-blue-300 p-1 font-semibold text-gray-700">Toplam İskonto</td>
                        <td className="border border-blue-300 p-1 text-right">{(iskontoTutar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                      </tr>
                      <tr>
                        <td className="border border-blue-300 p-1 font-semibold text-gray-700 bg-blue-50">İskontolu Ara Toplam</td>
                        <td className="border border-blue-300 p-1 text-right bg-blue-50 font-semibold">{araToplamIskontolu.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                      </tr>
                      <tr>
                        <td className="border border-blue-300 p-1 font-semibold text-gray-700">Hesaplanan KDV</td>
                        <td className="border border-blue-300 p-1 text-right">{kdvToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                      </tr>
                      <tr className="bg-blue-600 text-white font-bold text-[12px]">
                        <td className="border border-blue-600 p-1.5 uppercase">Ödenecek Tutar</td>
                        <td className="border border-blue-600 p-1.5 text-right">{genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {paraBirimi}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
              
              {/* Alt Bilgi */}
              <div className="mt-8 text-center text-[9px] text-gray-400 border-t border-gray-200 pt-2">
                Bu fatura elektronik ortamda oluşturulmuş taslak önizlemesidir. Gerçek gönderimde XSLT şablonunuz üzerinden oluşturulacaktır.
              </div>

            </div>
          </div>
        </div>

      )}
    </div>
  );
}
