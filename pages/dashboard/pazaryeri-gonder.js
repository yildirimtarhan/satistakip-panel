"use client";
import { useEffect, useState, useRef } from "react";

const MARKETPLACES = [
  { key: "n11",         label: "N11",          color: "bg-orange-500" },
  { key: "trendyol",    label: "Trendyol",     color: "bg-orange-600" },
  { key: "hepsiburada", label: "Hepsiburada",  color: "bg-blue-600"   },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

export default function PazaryeriGonderPage() {
  const [activeTab, setActiveTab]   = useState("n11");
  const [products, setProducts]     = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [product, setProduct]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [taskResult, setTaskResult] = useState(null);

  // N11 form
  const [n11Form, setN11Form] = useState({
    catL1: "", catL2: "", catL3: "", preparingDay: "3",
    shipmentTemplate: "", vatRate: "20", description: "",
  });
  const [n11CatsL1, setN11CatsL1] = useState([]);
  const [n11CatsL2, setN11CatsL2] = useState([]);
  const [n11CatsL3, setN11CatsL3] = useState([]);
  const [n11Attrs, setN11Attrs]   = useState([]);   // mandatory + optional
  const [n11AttrVals, setN11AttrVals] = useState({}); // { attributeId: value }

  // Trendyol form
  const [tyForm, setTyForm] = useState({
    categoryId: "", brandId: "", cargoCompanyId: "10",
    vatRate: "20", stockCode: "",
  });

  // HB form
  const [hbForm, setHbForm] = useState({
    categoryId: "", catName: "", catPath: "", brandName: "", vatRate: "18",
    guaranteePeriod: "24", cargoCompany1: "ups", cargoCompany2: "aras", cargoCompany3: "mng",
  });
  const [hbCats, setHbCats] = useState([]);
  const [hbCatLoading, setHbCatLoading] = useState(false);
  const [hbAttrs, setHbAttrs] = useState([]);
  const [hbAttrVals, setHbAttrVals] = useState({});
  const [hbCatSearch, setHbCatSearch] = useState("");
  const hbSearchTimer = useRef(null);

  // Görsel URL'leri
  const [imageUrls, setImageUrls]   = useState([""]);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : "");
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  /* ── Ürün listesi ── */
  useEffect(() => {
    fetch("/api/products/list", { headers: headers() })
      .then((r) => r.json())
      .then((d) => setProducts(d?.products || d?.items || []))
      .catch(() => {});
  }, []);

  /* ── Ürün seçilince detay yükle ── */
  useEffect(() => {
    if (!selectedId) { setProduct(null); return; }
    fetch(`/api/products/get?id=${selectedId}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        const p = d?.product || d;
        setProduct(p);
        // Mevcut ayarları form'a doldur
        if (p?.marketplaceSettings?.n11) {
          const ms = p.marketplaceSettings.n11;
          setN11Form((f) => ({ ...f,
            categoryId: ms.categoryId || "",
            brandId: ms.brandId || "",
            brandName: ms.brandName || "",
          }));
        }
        // Görselleri doldur
        const imgs = (p?.images || []).map((i) => (typeof i === "string" ? i : i?.url || ""));
        setImageUrls(imgs.length ? imgs : [""]);
      })
      .catch(() => {});
  }, [selectedId]);

  /* ── N11 Level-1 kategoriler ── */
  useEffect(() => {
    fetch("/api/n11/categories/list", { headers: headers() })
      .then((r) => r.json())
      .then((d) => setN11CatsL1(d?.categories || []))
      .catch(() => {});
  }, []);

  /* ── N11 Level-2 alt kategoriler ── */
  useEffect(() => {
    if (!n11Form.catL1) { setN11CatsL2([]); setN11CatsL3([]); setN11Attrs([]); return; }
    fetch(`/api/n11/categories/sub?id=${n11Form.catL1}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setN11CatsL2(d?.subCategories || []))
      .catch(() => {});
  }, [n11Form.catL1]);

  /* ── N11 Level-3 alt kategoriler ── */
  useEffect(() => {
    if (!n11Form.catL2) { setN11CatsL3([]); setN11Attrs([]); return; }
    fetch(`/api/n11/categories/sub?id=${n11Form.catL2}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        const subs = d?.subCategories || [];
        setN11CatsL3(subs);
        // Alt kategori yoksa L2 zaten leaf — attribute çek
        if (subs.length === 0) fetchN11Attrs(n11Form.catL2);
        else setN11Attrs([]);
      })
      .catch(() => {});
  }, [n11Form.catL2]);

  /* ── N11 Attribute'lar (leaf kategori seçilince) ── */
  const fetchN11Attrs = (catId) => {
    setN11Attrs([]);
    setN11AttrVals({});
    fetch(`/api/n11/categories/attributes?categoryId=${catId}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setN11Attrs(d.attributes || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!n11Form.catL3) return;
    fetchN11Attrs(n11Form.catL3);
  }, [n11Form.catL3]);

  /* ── HB: arama debounce → kategori yükle ── */
  const fetchHBCats = (q) => {
    setHbCatLoading(true);
    const params = q ? `&search=${encodeURIComponent(q)}&size=100` : "&size=50";
    fetch(`/api/hepsiburada/categories/list?leaf=false${params}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setHbCats(d.categories || []); })
      .catch(() => {})
      .finally(() => setHbCatLoading(false));
  };

  useEffect(() => {
    if (activeTab !== "hepsiburada") return;
    if (hbCatSearch.length < 2) {
      if (hbCats.length === 0) fetchHBCats(""); // ilk yüklemede birkaç kategori getir
      return;
    }
    clearTimeout(hbSearchTimer.current);
    hbSearchTimer.current = setTimeout(() => fetchHBCats(hbCatSearch), 400);
    return () => clearTimeout(hbSearchTimer.current);
  }, [hbCatSearch, activeTab]);

  /* ── HB: ürün seçilince marka otomatik doldur ── */
  useEffect(() => {
    if (!product || activeTab !== "hepsiburada") return;
    const brand = product.brand || product.marka || product.brandName || "";
    if (brand) setHbForm((f) => ({ ...f, brandName: brand }));
  }, [product, activeTab]);

  /* ── HB kategori seçilince attribute yükle ── */
  useEffect(() => {
    if (!hbForm.categoryId) { setHbAttrs([]); setHbAttrVals({}); return; }
    fetch(`/api/hepsiburada/categories/attributes?categoryId=${hbForm.categoryId}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setHbAttrs(d.attributes || []); })
      .catch(() => {});
  }, [hbForm.categoryId]);

  /* ── Görsel satır yönetimi ── */
  const addImageRow    = () => setImageUrls((p) => [...p, ""]);
  const removeImageRow = (i) => setImageUrls((p) => p.filter((_, idx) => idx !== i));
  const updateImage    = (i, v) => setImageUrls((p) => p.map((u, idx) => (idx === i ? v : u)));

  // N11/Trendyol: görsel URL direkt resim dosyası olmalı (.jpg/.png/.webp vb.)
  const isDirectImageUrl = (u) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(u) || u.includes("/image/") || u.includes("/img/") || u.includes("cdn");
  const validImages = imageUrls.filter((u) => u.trim().startsWith("http"));
  const warnImages  = validImages.filter((u) => !isDirectImageUrl(u));

  /* ── Gönderim ── */
  const handleSend = async () => {
    if (!selectedId) { alert("Ürün seçin"); return; }
    setSending(true);
    setTaskResult(null);
    try {
      let body, endpoint;

      if (activeTab === "n11") {
        const leafCatId = n11Form.catL3 || n11Form.catL2 || n11Form.catL1;
        endpoint = "/api/n11/products/create";

        // Attribute'ları oluştur
        const attrPayload = Object.entries(n11AttrVals)
          .filter(([, v]) => v)
          .map(([attrId, val]) => {
            const attr = n11Attrs.find((a) => a.id === attrId);
            // customValue=false → valueId zorunlu (GetCategoryAttributeValue'dan gelen gerçek ID)
            if (attr && !attr.allowCustom && attr.values?.length) {
              const valObj = attr.values.find((v) => v.id === val || v.name === val);
              if (valObj?.id) return { id: Number(attrId), valueId: Number(valObj.id) };
            }
            // customValue=true → serbest metin veya öneri listesinden seçilen isim
            return { id: Number(attrId), customValue: val };
          });

        // Görsel listesini de ürüne kaydet (bu çalışıyor çünkü "images" allowed)
        if (validImages.length > 0) {
          await fetch(`/api/products/update?id=${selectedId}`, {
            method: "PUT", headers: headers(),
            body: JSON.stringify({ images: validImages }),
          });
        }

        body = {
          productId: selectedId,
          n11Override: {
            categoryId: leafCatId,
            attributes: attrPayload,
            shipmentTemplate: n11Form.shipmentTemplate,
            preparingDay: n11Form.preparingDay,
            vatRate: n11Form.vatRate,
            description: n11Form.description || undefined,
          },
        };
      } else if (activeTab === "trendyol") {
        endpoint = "/api/trendyol/products/create";
        body = {
          product: {
            barcode: product?.barcode || product?.barkod,
            title: product?.name || product?.title,
            description: product?.description,
            categoryId: tyForm.categoryId,
            brandId: tyForm.brandId,
            stockCode: tyForm.stockCode || product?.sku || product?.barcode,
            quantity: product?.stock ?? 0,
            listPrice: product?.listPrice || product?.price,
            salePrice: product?.price || product?.salePrice,
            vatRate: tyForm.vatRate,
            cargoCompanyId: tyForm.cargoCompanyId,
            images: validImages,
            attributes: [],
          },
        };
      } else {
        endpoint = "/api/hepsiburada/products/create";
        // HB attribute payload
        const hbAttrPayload = {};
        hbAttrs.forEach((attr) => {
          const val = hbAttrVals[attr.id || attr.name];
          if (val) hbAttrPayload[attr.name || attr.id] = val;
        });
        body = {
          product: {
            barcode: product?.barcode || product?.barkod,
            title: product?.name || product?.title,
            description: product?.description,
            categoryId: hbForm.categoryId,
            brandName: hbForm.brandName,
            stockCode: product?.sku || product?.stockCode || product?.barcode,
            vatRate: hbForm.vatRate,
            guaranteePeriod: hbForm.guaranteePeriod,
            cargoCompany1: hbForm.cargoCompany1,
            cargoCompany2: hbForm.cargoCompany2,
            cargoCompany3: hbForm.cargoCompany3,
            images: validImages,
            hbAttributes: hbAttrPayload,
          },
        };
      }

      const res = await fetch(endpoint, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      setTaskResult(data);
    } catch (err) {
      setTaskResult({ success: false, message: err.message });
    }
    setSending(false);
  };

  /* ── Durum sorgula (N11) ── */
  const checkStatus = async () => {
    if (!taskResult?.taskId && !product?._id) return;
    const url = product?._id
      ? `/api/n11/products/task-status?productId=${product._id}`
      : `/api/n11/products/task-status?taskId=${taskResult.taskId}`;
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();
    setTaskResult((p) => ({ ...p, ...data, status: data.status || p.status }));
  };

  /* ── UI ── */
  const tabBtnClass = (key) =>
    `px-5 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition ${
      activeTab === key
        ? "border-orange-500 text-orange-600 bg-white"
        : "border-transparent text-gray-500 hover:text-gray-700 bg-gray-50"
    }`;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Pazaryerine Ürün Gönder</h1>

      {/* Ürün Seç */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">ERP Ürünü</label>
        <select
          className="w-full border rounded-lg p-2"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Ürün seçin —</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name || p.title} | {p.sku || p.barcode || "SKU yok"}
            </option>
          ))}
        </select>
        {product && (
          <div className="mt-2 text-sm text-gray-500 flex gap-4">
            <span>Fiyat: <b>{fmt(product.price)} TL</b></span>
            <span>Stok: <b>{product.stock ?? 0}</b></span>
            <span>Barkod: <b>{product.barcode || product.barkod || "—"}</b></span>
          </div>
        )}
      </div>

      {/* Görsel URL'leri */}
      <div className="mb-6 border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">Ürün Görselleri (URL)</span>
          <button onClick={addImageRow} className="text-blue-600 text-xs hover:underline">+ Görsel ekle</button>
        </div>
        {imageUrls.map((url, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="url"
              value={url}
              onChange={(e) => updateImage(i, e.target.value)}
              placeholder={`https://... (Görsel ${i + 1})`}
              className="flex-1 border rounded p-2 text-sm"
            />
            {url && (
              <img src={url} alt="" className="w-10 h-10 object-cover rounded border"
                onError={(e) => (e.target.style.display = "none")} />
            )}
            <button onClick={() => removeImageRow(i)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
          </div>
        ))}
        <p className="text-xs text-gray-400">{validImages.length} geçerli görsel — HTTPS URL olmalı</p>
        {warnImages.length > 0 && (
          <p className="text-xs text-red-500 mt-1">
            Uyarı: {warnImages.length} görsel HTML sayfa URL gibi görünüyor. N11/Trendyol direkt resim URL ister (.jpg, .png, .webp). akakce, hepsiburada ürün sayfaları kabul edilmez!
          </p>
        )}
      </div>

      {/* Pazaryeri Sekmeleri */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex border-b bg-gray-50">
          {MARKETPLACES.map((m) => (
            <button key={m.key} className={tabBtnClass(m.key)} onClick={() => setActiveTab(m.key)}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* N11 */}
          {activeTab === "n11" && (
            <div className="space-y-4">
              {/* 3-seviye kategori */}
              <div>
                <label className="block text-sm font-medium mb-1">Ana Kategori *</label>
                <select className="w-full border rounded p-2"
                  value={n11Form.catL1}
                  onChange={(e) => setN11Form((f) => ({ ...f, catL1: e.target.value, catL2: "", catL3: "" }))}>
                  <option value="">Seçin...</option>
                  {n11CatsL1.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {n11CatsL2.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Alt Kategori *</label>
                  <select className="w-full border rounded p-2"
                    value={n11Form.catL2}
                    onChange={(e) => setN11Form((f) => ({ ...f, catL2: e.target.value, catL3: "" }))}>
                    <option value="">Seçin...</option>
                    {n11CatsL2.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {n11CatsL3.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Ürün Kategorisi (Dip Seviye) *</label>
                  <select className="w-full border rounded p-2"
                    value={n11Form.catL3}
                    onChange={(e) => setN11Form((f) => ({ ...f, catL3: e.target.value }))}>
                    <option value="">Seçin...</option>
                    {n11CatsL3.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Dinamik Attribute Alanları */}
              {n11Attrs.length > 0 && (
                <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-800 mb-3">
                    Kategori Özellikleri
                    <span className="ml-2 text-yellow-600 font-normal">({n11Attrs.filter(a=>a.mandatory).length} zorunlu)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {n11Attrs.map((attr) => (
                      <div key={attr.id}>
                        <label className="block text-xs font-medium mb-1">
                          {attr.name}
                          {attr.mandatory && <span className="text-red-500 ml-1">*</span>}
                          {attr.allowCustom && <span className="text-gray-400 ml-1 text-[10px]">(serbest)</span>}
                        </label>
                        {/* customValue=false → dropdown, ID zorunlu */}
                        {!attr.allowCustom && attr.values?.length > 0 ? (
                          <select
                            className="w-full border rounded p-2 text-sm bg-white"
                            value={n11AttrVals[attr.id] || ""}
                            onChange={(e) => setN11AttrVals((p) => ({ ...p, [attr.id]: e.target.value }))}>
                            <option value="">— Seçin —</option>
                            {attr.values.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        ) : attr.allowCustom && attr.values?.length > 0 ? (
                          /* customValue=true + öneri listesi → combo (datalist) */
                          <>
                            <input
                              list={`dl-${attr.id}`}
                              type="text"
                              className="w-full border rounded p-2 text-sm bg-white"
                              placeholder={`${attr.name} yazın veya seçin`}
                              value={n11AttrVals[attr.id] || ""}
                              onChange={(e) => setN11AttrVals((p) => ({ ...p, [attr.id]: e.target.value }))}
                            />
                            <datalist id={`dl-${attr.id}`}>
                              {attr.values.map((v, i) => <option key={i} value={v.name} />)}
                            </datalist>
                          </>
                        ) : (
                          /* Değer yok → serbest metin */
                          <input
                            type="text"
                            className="w-full border rounded p-2 text-sm"
                            placeholder={attr.name}
                            value={n11AttrVals[attr.id] || ""}
                            onChange={(e) => setN11AttrVals((p) => ({ ...p, [attr.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KDV + Hazırlık + Teslimat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">KDV %</label>
                  <select className="w-full border rounded p-2" value={n11Form.vatRate}
                    onChange={(e) => setN11Form((f) => ({ ...f, vatRate: e.target.value }))}>
                    {["0","1","10","20"].map((v) => <option key={v} value={v}>%{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hazırlık Günü</label>
                  <input type="number" className="w-full border rounded p-2" value={n11Form.preparingDay}
                    onChange={(e) => setN11Form((f) => ({ ...f, preparingDay: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Teslimat Şablonu</label>
                  <select className="w-full border rounded p-2" value={n11Form.shipmentTemplate}
                    onChange={(e) => setN11Form((f) => ({ ...f, shipmentTemplate: e.target.value }))}>
                    <option value="">— Seçin (boş bırakılabilir) —</option>
                    <option value="Alıcı Öder">Alıcı Öder</option>
                    <option value="Bandırma">Bandırma</option>
                    <option value="Mağaza Öder">Mağaza Öder</option>
                    <option value="Ürün">Ürün</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">N11 panelindeki şablon adıyla tam eşleşmeli</p>
                </div>
              </div>

              {/* Ürün Açıklaması */}
              <div>
                <label className="block text-sm font-medium mb-1">Ürün Açıklaması <span className="text-gray-400 font-normal">(boş bırakılırsa ürün açıklaması kullanılır)</span></label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  placeholder="N11'e gönderilecek ürün açıklaması..."
                  value={n11Form.description}
                  onChange={(e) => setN11Form((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                Dip seviye kategoriyi seçince zorunlu alanlar otomatik yüklenir. Görsel: {validImages.length} adet.
              </div>
            </div>
          )}

          {/* TRENDYOL */}
          {activeTab === "trendyol" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori ID *</label>
                  <input type="text" className="w-full border rounded p-2" placeholder="411"
                    value={tyForm.categoryId} onChange={(e) => setTyForm((f) => ({ ...f, categoryId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marka ID *</label>
                  <input type="text" className="w-full border rounded p-2" placeholder="1791"
                    value={tyForm.brandId} onChange={(e) => setTyForm((f) => ({ ...f, brandId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stok Kodu</label>
                  <input type="text" className="w-full border rounded p-2" placeholder="STK-001"
                    value={tyForm.stockCode} onChange={(e) => setTyForm((f) => ({ ...f, stockCode: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kargo Firması ID</label>
                  <input type="text" className="w-full border rounded p-2" placeholder="10"
                    value={tyForm.cargoCompanyId} onChange={(e) => setTyForm((f) => ({ ...f, cargoCompanyId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">KDV %</label>
                  <select className="w-full border rounded p-2" value={tyForm.vatRate}
                    onChange={(e) => setTyForm((f) => ({ ...f, vatRate: e.target.value }))}>
                    {["0","1","8","10","18","20"].map((v) => <option key={v} value={v}>%{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                ℹ️ Trendyol: Kategori ve Marka ID Trendyol panelinden alınmalı. Görsel sayısı: {validImages.length}
              </div>
            </div>
          )}

          {/* HEPSİBURADA */}
          {activeTab === "hepsiburada" && (
            <div className="space-y-4">
              {/* Kategori arama + seç */}
              <div>
                <label className="block text-sm font-medium mb-1">Kategori Ara *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm mb-1"
                  placeholder="En az 2 harf yazın (örn: Cep Telefonu, Hafıza Kartı...)"
                  value={hbCatSearch}
                  onChange={(e) => setHbCatSearch(e.target.value)}
                />
                {hbCatLoading && <p className="text-xs text-blue-500">Kategoriler aranıyor...</p>}
                {!hbCatLoading && hbCats.length === 0 && hbCatSearch.length >= 2 && (
                  <p className="text-xs text-red-500">Sonuç bulunamadı. Farklı bir terim deneyin.</p>
                )}
                {hbCats.length > 0 && (
                  <select
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                    value={hbForm.categoryId}
                    onChange={(e) => {
                      const cat = hbCats.find((c) => String(c.id) === e.target.value);
                      setHbForm((f) => ({
                        ...f,
                        categoryId: e.target.value,
                        catName: cat?.name || "",
                        catPath: cat?.path || "",
                      }));
                    }}
                  >
                    <option value="">— Kategori Seçin —</option>
                    {hbCats.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.path ? `${c.path}` : c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                )}
                {hbForm.categoryId && (
                  <p className="text-xs text-green-600 mt-1">
                    Seçili: <strong>{hbForm.catName}</strong> (ID: {hbForm.categoryId})
                    {hbForm.catPath && <span className="text-gray-400 ml-1">— {hbForm.catPath}</span>}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marka Adı *</label>
                  <input type="text" className="w-full border rounded-lg p-2 text-sm"
                    placeholder="Otomatik doldurulur (ERP'den)"
                    value={hbForm.brandName}
                    onChange={(e) => setHbForm((f) => ({ ...f, brandName: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-0.5">ERP ürünündeki marka otomatik gelir</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">KDV %</label>
                  <select className="w-full border rounded-lg p-2 text-sm" value={hbForm.vatRate}
                    onChange={(e) => setHbForm((f) => ({ ...f, vatRate: e.target.value }))}>
                    {["0","1","8","10","18","20"].map((v) => <option key={v} value={v}>%{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Garanti Süresi (Ay)</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-sm"
                    value={hbForm.guaranteePeriod}
                    onChange={(e) => setHbForm((f) => ({ ...f, guaranteePeriod: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kargo 1</label>
                  <select className="w-full border rounded-lg p-2 text-sm" value={hbForm.cargoCompany1}
                    onChange={(e) => setHbForm((f) => ({ ...f, cargoCompany1: e.target.value }))}>
                    {["ups","aras","mng","yurtici","ptt","horoz","surat","trendyolexpress"].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              {/* Kategori attribute'ları */}
              {hbAttrs.length > 0 && (
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-3">
                    Kategori Özellikleri
                    <span className="ml-2 text-blue-600 font-normal">
                      ({hbAttrs.filter((a) => a.required || a.mandatory).length} zorunlu)
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {hbAttrs.map((attr) => {
                      const key = attr.id || attr.name;
                      const vals = attr.values || attr.attributeValues || [];
                      return (
                        <div key={key}>
                          <label className="block text-xs font-medium mb-1">
                            {attr.name || attr.attributeName}
                            {(attr.required || attr.mandatory) && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {vals.length > 0 ? (
                            <select className="w-full border rounded p-2 text-sm bg-white"
                              value={hbAttrVals[key] || ""}
                              onChange={(e) => setHbAttrVals((p) => ({ ...p, [key]: e.target.value }))}>
                              <option value="">— Seçin —</option>
                              {vals.map((v, i) => (
                                <option key={i} value={v.id || v.name || v}>{v.name || v.value || v}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" className="w-full border rounded p-2 text-sm"
                              placeholder={attr.name || attr.attributeName}
                              value={hbAttrVals[key] || ""}
                              onChange={(e) => setHbAttrVals((p) => ({ ...p, [key]: e.target.value }))} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                Hepsiburada bağlantısı için{" "}
                <a href="/dashboard/api-settings" className="underline font-medium">API Ayarlarına</a>
                {" "}kullanıcı adı, şifre ve Merchant ID girmeyi unutmayın.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gönder Butonu */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleSend}
          disabled={sending || !selectedId}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {sending ? "Gönderiliyor..." : `${MARKETPLACES.find((m) => m.key === activeTab)?.label}'e Gönder`}
        </button>
      </div>

      {/* Sonuç */}
      {taskResult && (
        <div className={`mt-4 border rounded-lg p-4 ${taskResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-semibold ${taskResult.success ? "text-green-700" : "text-red-700"}`}>
              {taskResult.success ? "✅ Gönderildi" : "❌ Hata"}
            </span>
            {taskResult.taskId && activeTab === "n11" && (
              <button onClick={checkStatus} className="text-sm text-blue-600 hover:underline">Durumu Sorgula</button>
            )}
          </div>
          {taskResult.taskId && <p className="text-sm">Task ID: <b>{taskResult.taskId}</b></p>}
          {taskResult.batchRequestId && <p className="text-sm">Batch ID: <b>{taskResult.batchRequestId}</b></p>}
          {taskResult.status && (
            <p className="text-sm">Durum: <b className={taskResult.status === "COMPLETED" ? "text-green-600" : taskResult.status === "FAILED" ? "text-red-600" : "text-yellow-600"}>{taskResult.status}</b></p>
          )}
          {taskResult.reason && <p className="text-sm text-red-500">Hata: {taskResult.reason}</p>}
          {taskResult.message && <p className="text-sm text-gray-600">{taskResult.message}</p>}
          {taskResult.raw && (
            <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-auto max-h-40">
              {JSON.stringify(taskResult.raw, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
