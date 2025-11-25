// 📄 /pages/dashboard/urunler.js
import { useState, useEffect } from "react";

export default function UrunlerPanel() {
  const [urunler, setUrunler] = useState([]);
  const [editProduct, setEditProduct] = useState(null);

  const emptyForm = {
    ad: "",
    barkod: "",
    sku: "",
    marka: "",
    kategori: "",
    aciklama: "",
    birim: "Adet",
    alisFiyati: "",
    satisFiyati: "",
    stok: 0,
    stokUyari: "",
    paraBirimi: "TRY",
    kdvOrani: 20,
    resimUrl: "",        // kapak foto
    resimUrls: [],       // maksimum 4 foto
    varyantlar: [],      // { ad, stok }
    n11CategoryId: "",   // seçilen N11 kategori ID
  };

  const [form, setForm] = useState(emptyForm);

  const emptyPazaryeriSecim = {
    n11: false,
    trendyol: false,
    hepsiburada: false,
    amazon: false,
    pazarama: false,
  };
  const [pazaryeriSecim, setPazaryeriSecim] = useState(emptyPazaryeriSecim);

  // 🔹 N11 kategori seçici state'leri
  const [n11Modal, setN11Modal] = useState(false);
  const [n11Categories, setN11Categories] = useState([]);
  const [n11Loading, setN11Loading] = useState(false);
  const [n11Error, setN11Error] = useState("");
  const [selectedN11Category, setSelectedN11Category] = useState("");

  // 🔐 Ortak helper: Token ile POST isteği
  const postWithToken = async (url, body, okMessage) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      alert("❌ Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      return;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body || {}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        console.error("Pazaryeri hata:", data);
        alert(
          "❌ İşlem başarısız: " +
            (data.message || data.error || `HTTP ${res.status}`)
        );
        return;
      }

      if (okMessage) {
        alert(okMessage);
      } else {
        alert("✅ İşlem başarılı");
      }

      // Ürünlerde bir değişiklik olduysa listeyi tazele
      fetchUrunler();
    } catch (err) {
      console.error("Pazaryeri istek hatası:", err);
      alert("❌ Sunucuya bağlanırken hata oluştu.");
    }
  };

  // 🛒 N11’e gönder
  const sendToN11 = async (u) => {
    if (!u?._id) {
      alert("Ürün ID bulunamadı.");
      return;
    }
    if (
      !confirm(
        `Bu ürünü N11'de listelemek istiyor musunuz?\n\n${u.ad || "Ürün"}`
      )
    )
      return;
    await postWithToken(
      "/api/n11/products/saveProduct",
      { productId: u._id },
      "✅ Ürün N11'e gönderildi."
    );
  };

  // 🛍 Trendyol’a gönder (placeholder)
  const sendToTrendyol = async (u) => {
    alert(
      "🛍 Trendyol entegrasyonu hazırlanıyor. Bu buton şimdilik bilgi amaçlı.\n\nÜrün: " +
        (u.ad || "")
    );
  };

  // 🧾 Hepsiburada’ya gönder (placeholder)
  const sendToHepsiburada = async (u) => {
    alert(
      "🧾 Hepsiburada ürün gönderimi modülü hazırlanıyor.\n\nÜrün: " +
        (u.ad || "")
    );
  };

  // 📦 Amazon’a gönder (placeholder)
  const sendToAmazon = async (u) => {
    alert(
      "📦 Amazon ürün entegrasyonu daha sonra aktif edilecek.\n\nÜrün: " +
        (u.ad || "")
    );
  };

  // 🛍 Pazarama / PTT AVM’ye gönder (placeholder)
  const sendToPazarama = async (u) => {
    alert(
      "🛍 Pazarama / PTT AVM entegrasyonu planlandı. Şimdilik bilgi amaçlı.\n\nÜrün: " +
        (u.ad || "")
    );
  };

  // ⬇️ Excel helpers
  const downloadBlob = (blob, filename) => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  async function exportUrunler() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler/export", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert("❌ Export başarısız");
    const blob = await res.blob();
    downloadBlob(blob, "urunler.xlsx");
  }

  async function importUrunler(file) {
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/urunler/import", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("❌ Import başarısız");
    alert(`✅ ${data.count || 0} ürün içe aktarıldı`);
    fetchUrunler();
  }

  // ✅ Ürünleri getir
  const fetchUrunler = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/urunler", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => []);
    setUrunler(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUrunler();
  }, []);

  // 🔹 N11 kategori listesini yükle
  const loadN11Categories = async () => {
    setN11Loading(true);
    setN11Error("");
    try {
      const res = await fetch("/api/n11/categories/list");
      const data = await res.json();

      if (!res.ok || !data.success) {
        setN11Error(data.message || "Kategori alınamadı");
        setN11Categories([]);
      } else {
        setN11Categories(
          Array.isArray(data.categories) ? data.categories : [data.categories]
        );
      }
    } catch (err) {
      console.error("N11 kategori hata:", err);
      setN11Error("Sunucuya bağlanırken hata oluştu");
      setN11Categories([]);
    } finally {
      setN11Loading(false);
    }
  };

  // ✅ Kaydet / Güncelle
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.ad.trim()) return alert("⚠️ Ürün adı gerekli");
    if (!form.satisFiyati) return alert("⚠️ Satış fiyatı gerekli");

    let url = "/api/urunler";
    let method = "POST";

    const toplamStok = (form.varyantlar || []).reduce(
      (s, v) => s + (Number(v.stok) || 0),
      0
    );

    if (editProduct) {
      url += `?id=${editProduct._id}`;
      method = "PUT";
    }

    const payload = {
      ...form,
      stok: toplamStok, // ✅ toplam varyant stok
      alisFiyati: Number(form.alisFiyati || 0),
      satisFiyati: Number(form.satisFiyati),
      stokUyari: Number(form.stokUyari || 0),
      kdvOrani: Number(form.kdvOrani),
      // güvenlik için en fazla 4 resim gönder
      resimUrls: (form.resimUrls || []).slice(0, 4),
      resimUrl:
        form.resimUrl ||
        (form.resimUrls && form.resimUrls.length > 0
          ? form.resimUrls[0]
          : ""),
    };

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Ürün kayıt hatası:", data);
      alert(
        "❌ Hata oluştu: " +
          (data.message || data.error || `HTTP ${res.status}`)
      );
      return;
    }

    alert(editProduct ? "✅ Ürün güncellendi" : "✅ Ürün eklendi");

    // 👉 Kaydettikten sonra pazaryerlerine otomatik gönderim
    try {
      const savedId =
        data._id || data.id || (editProduct ? editProduct._id : null);

      if (savedId && !editProduct) {
        const savedProduct = {
          _id: savedId,
          ad: form.ad,
          barkod: form.barkod,
          sku: form.sku,
          stok: toplamStok,
          resimUrl:
            form.resimUrl ||
            (form.resimUrls && form.resimUrls.length > 0
              ? form.resimUrls[0]
              : ""),
        };

        if (pazaryeriSecim.n11) {
          await sendToN11(savedProduct);
        }
        if (pazaryeriSecim.trendyol) {
          await sendToTrendyol(savedProduct);
        }
        if (pazaryeriSecim.hepsiburada) {
          await sendToHepsiburada(savedProduct);
        }
        if (pazaryeriSecim.amazon) {
          await sendToAmazon(savedProduct);
        }
        if (pazaryeriSecim.pazarama) {
          await sendToPazarama(savedProduct);
        }
      }
    } catch (err) {
      console.error("Pazaryeri otomatik gönderim hatası:", err);
    }

    setForm(emptyForm);
    setEditProduct(null);
    setPazaryeriSecim(emptyPazaryeriSecim);
    setSelectedN11Category("");
    fetchUrunler();
  };

  // ✅ Sil
  const handleDelete = async (id) => {
    if (!confirm("Silinsin mi?")) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/urunler?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUrunler();
  };

  // ✅ Düzenle
  const handleEdit = (u) => {
    const resimUrlsFromDb =
      u.resimUrls && Array.isArray(u.resimUrls)
        ? u.resimUrls
        : u.resimUrl
        ? [u.resimUrl]
        : [];

    setEditProduct(u);
    setForm({
      ...emptyForm,
      ...u,
      resimUrls: resimUrlsFromDb,
      resimUrl: u.resimUrl || resimUrlsFromDb[0] || "",
      varyantlar: u.varyantlar || [],
      n11CategoryId: u.n11?.categoryId || u.n11CategoryId || "",
    });
    setPazaryeriSecim(emptyPazaryeriSecim);
    setSelectedN11Category(u.n11?.categoryId || u.n11CategoryId || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Çoklu görsel yükleme (maks. 4 adet)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let currentUrls = [...(form.resimUrls || [])];

    for (const file of files) {
      if (currentUrls.length >= 4) break; // maksimum 4 resim

      const fd = new FormData();
      fd.append("file", file);

      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.url) {
          currentUrls.push(data.url);
        } else {
          console.error("Görsel yüklenemedi:", data);
        }
      } catch (err) {
        console.error("Görsel upload hatası:", err);
      }
    }

    setForm((f) => ({
      ...f,
      resimUrls: currentUrls,
      resimUrl: currentUrls[0] || f.resimUrl || "",
    }));

    // aynı dosyayı tekrar seçebilmek için input’u sıfırla
    e.target.value = "";
  };

  // ✅ Varyant Sil
  const removeVariant = (i) => {
    const newVars = (form.varyantlar || []).filter((_, x) => x !== i);
    setForm({ ...form, varyantlar: newVars });
  };

  // ✅ Fotoğraf sil
  const removeImage = (index) => {
    const next = (form.resimUrls || []).filter((_, i) => i !== index);
    setForm((f) => ({
      ...f,
      resimUrls: next,
      resimUrl: next[0] || "",
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4 text-center">
        📦 Ürün Yönetimi
      </h1>

      {/* Excel Araç Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow mb-4">
        <div className="font-semibold">Ürünler</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportUrunler}
            className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
          >
            ⬇️ Excel Dışa Aktar
          </button>

          <label className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 cursor-pointer">
            📥 Excel İçe Aktar
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                await importUrunler(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow grid grid-cols-12 gap-4 mb-8"
      >
        <input
          className="input col-span-6"
          placeholder="Ürün Adı *"
          value={form.ad}
          onChange={(e) => setForm({ ...form, ad: e.target.value })}
          required
        />

        <input
          className="input col-span-3"
          placeholder="Barkod"
          value={form.barkod}
          onChange={(e) => setForm({ ...form, barkod: e.target.value })}
        />

        <input
          className="input col-span-3"
          placeholder="SKU / Model"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />

        <input
          className="input col-span-3"
          placeholder="Marka"
          value={form.marka}
          onChange={(e) => setForm({ ...form, marka: e.target.value })}
        />

        <input
          className="input col-span-3"
          placeholder="Kategori"
          value={form.kategori}
          onChange={(e) => setForm({ ...form, kategori: e.target.value })}
        />

        <select
          className="input col-span-2"
          value={form.birim}
          onChange={(e) => setForm({ ...form, birim: e.target.value })}
        >
          <option>Adet</option>
          <option>Kutu</option>
          <option>Paket</option>
          <option>KG</option>
          <option>Litre</option>
        </select>

        <select
          className="input col-span-2"
          value={form.paraBirimi}
          onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
        >
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>

        <select
          className="input col-span-2"
          value={form.kdvOrani}
          onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}
        >
          {[1, 8, 10, 18, 20].map((k) => (
            <option key={k} value={k}>
              %{k}
            </option>
          ))}
        </select>

        <input
          className="input col-span-3"
          placeholder="Alış Fiyatı"
          value={form.alisFiyati}
          onChange={(e) => setForm({ ...form, alisFiyati: e.target.value })}
        />

        <input
          className="input col-span-3"
          placeholder="Satış Fiyatı *"
          value={form.satisFiyati}
          onChange={(e) => setForm({ ...form, satisFiyati: e.target.value })}
          required
        />

        <input
          className="input col-span-3"
          placeholder="Stok Uyarı Seviyesi"
          value={form.stokUyari}
          onChange={(e) => setForm({ ...form, stokUyari: e.target.value })}
        />

        {/* 🔍 N11 Kategori Seçici */}
        <div className="col-span-12 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadN11Categories();
              setSelectedN11Category(form.n11CategoryId || "");
              setN11Modal(true);
            }}
            className="px-3 py-2 text-sm rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            🔍 N11 Kategori Seç
          </button>
          {form.n11CategoryId && (
            <span className="text-xs text-green-600">
              ✔ Seçili N11 Kategori ID: {form.n11CategoryId}
            </span>
          )}
        </div>

        {/* Varyant + Stok */}
        <div className="col-span-12 mt-2">
          <label className="font-medium mb-1">Varyant &amp; Stok</label>
          <div className="flex gap-2 mb-1">
            <input
              id="varInput"
              className="input"
              placeholder="Varyant (Örn: Kırmızı-L)"
            />
            <input id="varStok" className="input w-28" placeholder="Stok" />
            <button
              type="button"
              className="btn"
              onClick={() => {
                const el = document.getElementById("varInput");
                const st = document.getElementById("varStok");
                if (!el.value.trim()) return;
                setForm((f) => ({
                  ...f,
                  varyantlar: [
                    ...(f.varyantlar || []),
                    { ad: el.value, stok: Number(st.value) || 0 },
                  ],
                }));
                el.value = "";
                st.value = "";
              }}
            >
              ➕ Ekle
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {(form.varyantlar || []).map((v, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-orange-200 rounded flex items-center gap-2"
              >
                {v.ad} — <b>{v.stok} stk</b>
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => removeVariant(i)}
                >
                  ✖
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Fotoğraflar (maks 4) */}
        <div className="col-span-12">
          <label className="block text-sm font-medium mb-1">
            Ürün Fotoğrafları (maks. 4 adet)
          </label>
          <input type="file" multiple onChange={handleImageUpload} />
          {form.resimUrls && form.resimUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.resimUrls.map((url, i) => (
                <div key={i} className="relative">
                  <img
                    src={url}
                    className="w-20 h-20 rounded border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    onClick={() => removeImage(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Açıklama */}
        <textarea
          className="input col-span-12 h-20"
          placeholder="Açıklama"
          value={form.aciklama}
          onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
        />

        {/* Pazaryeri Gönderim Seçenekleri */}
        <div className="col-span-12 border-t pt-4 mt-2">
          <div className="font-medium mb-2">
            Pazaryeri Gönderim{" "}
            <span className="text-xs text-slate-500">
              (Kaydettikten sonra seçilen pazaryerlerine gönder)
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pazaryeriSecim.n11}
                onChange={(e) =>
                  setPazaryeriSecim((p) => ({ ...p, n11: e.target.checked }))
                }
              />
              <span>🛒 N11</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pazaryeriSecim.trendyol}
                onChange={(e) =>
                  setPazaryeriSecim((p) => ({
                    ...p,
                    trendyol: e.target.checked,
                  }))
                }
              />
              <span>🧾 Trendyol</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pazaryeriSecim.hepsiburada}
                onChange={(e) =>
                  setPazaryeriSecim((p) => ({
                    ...p,
                    hepsiburada: e.target.checked,
                  }))
                }
              />
              <span>🧾 Hepsiburada</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pazaryeriSecim.amazon}
                onChange={(e) =>
                  setPazaryeriSecim((p) => ({
                    ...p,
                    amazon: e.target.checked,
                  }))
                }
              />
              <span>📦 Amazon</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pazaryeriSecim.pazarama}
                onChange={(e) =>
                  setPazaryeriSecim((p) => ({
                    ...p,
                    pazarama: e.target.checked,
                  }))
                }
              />
              <span>🛍 Pazarama / PTT AVM</span>
            </label>
          </div>
        </div>

        <div className="col-span-12 flex justify-end gap-2">
          {editProduct && (
            <button
              type="button"
              className="btn-gray"
              onClick={() => {
                setForm(emptyForm);
                setEditProduct(null);
                setPazaryeriSecim(emptyPazaryeriSecim);
                setSelectedN11Category("");
              }}
            >
              İptal
            </button>
          )}
          <button className="btn-primary">
            {editProduct ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>

      {/* 🔍 N11 Kategori Modal */}
      {n11Modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-orange-600">
                N11 Kategori Seç
              </h2>
              <button
                className="text-slate-500 hover:text-slate-800 text-sm"
                onClick={() => setN11Modal(false)}
              >
                ✖ Kapat
              </button>
            </div>

            {n11Loading && (
              <div className="text-sm text-slate-500 mb-2">
                Kategoriler yükleniyor...
              </div>
            )}

            {n11Error && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                {n11Error}
              </div>
            )}

            {!n11Loading && !n11Error && (
              <>
                <label className="text-sm font-medium mb-1">
                  Üst Kategoriler
                </label>
                <select
                  className="input w-full mb-4"
                  value={selectedN11Category}
                  onChange={(e) => setSelectedN11Category(e.target.value)}
                >
                  <option value="">Kategori seçin...</option>
                  {n11Categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex justify-end gap-2 mt-auto pt-2">
              <button
                className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200"
                onClick={() => setN11Modal(false)}
              >
                Vazgeç
              </button>
              <button
                className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                onClick={() => {
                  if (!selectedN11Category) {
                    alert("Lütfen bir kategori seçin");
                    return;
                  }
                  setForm((f) => ({
                    ...f,
                    n11CategoryId: selectedN11Category,
                  }));
                  setN11Modal(false);
                }}
              >
                ✔ Seç ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <table className="w-full bg-white rounded-xl shadow text-sm">
        <thead className="bg-orange-100">
          <tr>
            <th>#</th>
            <th>Ürün</th>
            <th>Barkod</th>
            <th>SKU</th>
            <th>Stok</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {urunler.map((u, i) => (
            <tr key={u._id} className="border-b hover:bg-slate-50">
              <td>{i + 1}</td>
              <td className="flex items-center gap-2 p-2">
                {u.resimUrl && (
                  <img src={u.resimUrl} className="w-8 h-8 rounded" />
                )}
                {u.ad}
              </td>
              <td>{u.barkod}</td>
              <td>{u.sku}</td>
              <td>
                <b>{u.stok}</b>
              </td>
              <td className="space-x-2">
                <button
                  className="text-blue-600"
                  onClick={() => handleEdit(u)}
                >
                  ✏️
                </button>
                <button
                  className="text-red-600"
                  onClick={() => handleDelete(u._id)}
                >
                  🗑️
                </button>

                {/* Pazaryeri butonları */}
                <button
                  className="text-orange-600"
                  title="N11'e Gönder"
                  onClick={() => sendToN11(u)}
                >
                  🛒
                </button>

                <button
                  className="text-purple-600"
                  title="Trendyol'a Gönder"
                  onClick={() => sendToTrendyol(u)}
                >
                  🛍️
                </button>

                <button
                  className="text-yellow-600"
                  title="Hepsiburada'ya Gönder"
                  onClick={() => sendToHepsiburada(u)}
                >
                  🧾
                </button>

                <button
                  className="text-blue-500"
                  title="Amazon'a Gönder"
                  onClick={() => sendToAmazon(u)}
                >
                  📦
                </button>

                <button
                  className="text-green-600"
                  title="Pazarama / PTT AVM'ye Gönder"
                  onClick={() => sendToPazarama(u)}
                >
                  🛍
                </button>
              </td>
            </tr>
          ))}
          {urunler.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                Kayıt yok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
