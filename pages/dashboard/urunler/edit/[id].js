// 📁 /pages/dashboard/urunler/edit/[id].js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CloudinaryUploader from "@/components/CloudinaryUploader";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);

  // Çok seviyeli kategoriler (N11)
  const [level1, setLevel1] = useState([]);
  const [level2, setLevel2] = useState([]);
  const [level3, setLevel3] = useState([]);

  const [selectedL1, setSelectedL1] = useState("");
  const [selectedL2, setSelectedL2] = useState("");
  const [selectedL3, setSelectedL3] = useState("");

  // Form State — Yeni Ürün Sayfası ile %100 Uyumlu
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    brand: "",
    modelCode: "",
    category: "",
    description: "",
    images: [],

    priceTl: "",
    discountPriceTl: "",
    vatRate: 20,

    usdPrice: "",
    eurPrice: "",
    profitMargin: 20,
    riskFactor: 1.05,
    fxSource: "tcmb",

    n11CategoryId: "",
    n11BrandId: "",
    n11ShipmentTemplate: "",
    n11PreparingDay: 3,
    n11Domestic: true,

    trendyolCategoryId: "",
    trendyolBrandId: "",
    trendyolCargoCompanyId: "",

    hbCategoryId: "",
    hbMerchantSku: "",
    hbDesi: "",
    hbKg: "",

    sendTo: {
      n11: false,
      trendyol: false,
      hepsiburada: false,
      amazon: false,
      pazarama: false,
      ciceksepeti: false,
      idefix: false,
      pttavm: false,
    },
  });

  // -------------------------------
  // BACKEND → ÜRÜNÜ GETİR (EDIT)
  // -------------------------------
  useEffect(() => {
    if (!id) return;
    loadProduct();
    loadLevel1();
    loadBrands();
  }, [id]);

  const loadProduct = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/products/get?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.product) {
        alert("Ürün bulunamadı.");
        return;
      }

      const p = data.product;

      // 🔥 Form state’ini ürün ile doldur
      setForm({
        name: p.name || "",
        sku: p.sku || "",
        barcode: p.barcode || "",
        brand: p.brand || "",
        modelCode: p.modelCode || "",
        category: p.category || "",
        description: p.description || "",
        images: p.images || [],

        priceTl: p.priceTl || "",
        discountPriceTl: p.discountPriceTl || "",
        vatRate: p.vatRate || 20,

        usdPrice: p.usdPrice || "",
        eurPrice: p.eurPrice || "",
        profitMargin: p.profitMargin || 20,
        riskFactor: p.riskFactor || 1.05,
        fxSource: p.fxSource || "tcmb",

        n11CategoryId: p?.marketplaceSettings?.n11?.categoryId || "",
        n11BrandId: p?.marketplaceSettings?.n11?.brandId || "",
        n11ShipmentTemplate: p?.marketplaceSettings?.n11?.shipmentTemplate || "",
        n11PreparingDay: p?.marketplaceSettings?.n11?.preparingDay || 3,
        n11Domestic: p?.marketplaceSettings?.n11?.domestic ?? true,

        trendyolCategoryId: p?.marketplaceSettings?.trendyol?.categoryId || "",
        trendyolBrandId: p?.marketplaceSettings?.trendyol?.brandId || "",
        trendyolCargoCompanyId:
          p?.marketplaceSettings?.trendyol?.cargoCompanyId || "",

        hbCategoryId: p?.marketplaceSettings?.hepsiburada?.categoryId || "",
        hbMerchantSku: p?.marketplaceSettings?.hepsiburada?.merchantSku || "",
        hbDesi: p?.marketplaceSettings?.hepsiburada?.desi || "",
        hbKg: p?.marketplaceSettings?.hepsiburada?.kg || "",

        sendTo: p.sendTo || {
          n11: false,
          trendyol: false,
          hepsiburada: false,
          amazon: false,
          pazarama: false,
          ciceksepeti: false,
          idefix: false,
          pttavm: false,
        },
      });

      setSelectedL1(p?.marketplaceSettings?.n11?.categoryId || "");
      setLoading(false);
    } catch (e) {
      console.error("Ürün yüklenemedi:", e);
    }
  };

  // ----------------------------------------
  // N11 CATEGORY & BRAND LOADING (Yeni.js ile aynı)
  // ----------------------------------------
  const loadBrands = async () => {
    try {
      const res = await fetch("/api/n11/brands");
      const d = await res.json();
      if (d.success) setBrands(d.brands);
    } catch (err) {
      console.error("Marka yükleme hatası:", err);
    }
  };

  const loadLevel1 = async () => {
    try {
      const res = await fetch("/api/n11/categories/list");
      const d = await res.json();
      setLevel1(d.categories || []);
    } catch (err) {
      console.error("Kategori yükleme hatası:", err);
    }
  };

  const loadSubCategories = async (parentId, setFn) => {
    try {
      const res = await fetch(`/api/n11/categories/sub?id=${parentId}`);
      const d = await res.json();
      setFn(d.categories || []);
    } catch (err) {
      setFn([]);
    }
  };

  // --------------------------------
  // FORM CHANGE HANDLERS
  // --------------------------------
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendToChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sendTo: { ...prev.sendTo, [key]: value },
    }));
  };

  // --------------------------------
  // UPDATE PRODUCT
  // --------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const payload = {
      ...form,
      images: form.images.filter(Boolean),

      marketplaceSettings: {
        n11: {
          categoryId: form.n11CategoryId,
          brandId: form.n11BrandId,
          preparingDay: form.n11PreparingDay,
          shipmentTemplate: form.n11ShipmentTemplate,
          domestic: form.n11Domestic,
        },
        trendyol: {
          categoryId: form.trendyolCategoryId,
          brandId: form.trendyolBrandId,
          cargoCompanyId: form.trendyolCargoCompanyId,
        },
        hepsiburada: {
          categoryId: form.hbCategoryId,
          merchantSku: form.hbMerchantSku,
          desi: form.hbDesi,
          kg: form.hbKg,
        },
      },
    };

    const res = await fetch(`/api/products/update?id=${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Ürün başarıyla güncellendi!");
      router.push("/dashboard/urunler");
    } else {
      alert("Hata: " + data.message);
    }
  };

  if (loading) return <div className="p-6">Yükleniyor...</div>;

  // --------------------------------------------------------------------

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Ürünü Düzenle</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Geri
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Gönderim Ayarları</TabsTrigger>
          </TabsList>

          {/* ---------------- GENEL BİLGİLER ---------------- */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              
              <div>
                <Label>Ürün Adı</Label>
                <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
              </div>

              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => handleChange("sku", e.target.value)} />
              </div>

              <div>
                <Label>Barkod</Label>
                <Input value={form.barcode} onChange={(e) => handleChange("barcode", e.target.value)} />
              </div>

              <div>
                <Label>Model Kodu</Label>
                <Input
                  value={form.modelCode}
                  onChange={(e) => handleChange("modelCode", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Görseller</Label>
                <CloudinaryUploader
                  images={form.images}
                  setImages={(imgs) =>
                    setForm((prev) => ({ ...prev, images: imgs }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* ------------- STOK & FIYAT --------------- */}
          <TabsContent value="stockPrice">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              
              <div>
                <Label>Satış Fiyatı (TL)</Label>
                <Input type="number" value={form.priceTl} onChange={(e) => handleChange("priceTl", e.target.value)} />
              </div>

              <div>
                <Label>İndirimli Fiyat</Label>
                <Input type="number" value={form.discountPriceTl} onChange={(e) => handleChange("discountPriceTl", e.target.value)} />
              </div>

              <div>
                <Label>KDV</Label>
                <Input type="number" value={form.vatRate} onChange={(e) => handleChange("vatRate", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* ------------- PAZARYERI AYARLARI --------------- */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* ----------- N11 ------------ */}
              <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm">N11 Ayarları</h2>

                {/* Kategori Dropdown Level 1-2-3 */}
                <Label>N11 Kategori</Label>
                <select
                  className="w-full border p-2 rounded-lg"
                  value={form.n11CategoryId}
                  onChange={(e) => handleChange("n11CategoryId", e.target.value)}
                >
                  <option value="">Kategori seç</option>
                  {level1.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Marka */}
                <Label>N11 Marka</Label>
                <select
                  className="w-full border p-2 rounded-lg"
                  value={form.n11BrandId}
                  onChange={(e) => handleChange("n11BrandId", e.target.value)}
                >
                  <option value="">Marka seç</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <Label>Hazırlık Günü</Label>
                <Input
                  type="number"
                  value={form.n11PreparingDay}
                  onChange={(e) => handleChange("n11PreparingDay", e.target.value)}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.n11Domestic}
                    onCheckedChange={(v) => handleChange("n11Domestic", v)}
                  />
                  <Label>Yerli Üretim</Label>
                </div>
              </div>

              {/* ----------- Trendyol ------------ */}
              <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm">Trendyol Ayarları</h2>

                <Label>Kategori ID</Label>
                <Input
                  value={form.trendyolCategoryId}
                  onChange={(e) => handleChange("trendyolCategoryId", e.target.value)}
                />

                <Label>Marka ID</Label>
                <Input
                  value={form.trendyolBrandId}
                  onChange={(e) => handleChange("trendyolBrandId", e.target.value)}
                />

                <Label>Kargo Firma ID</Label>
                <Input
                  value={form.trendyolCargoCompanyId}
                  onChange={(e) => handleChange("trendyolCargoCompanyId", e.target.value)}
                />
              </div>

              {/* ----------- Hepsiburada ------------ */}
              <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm">HB Ayarları</h2>

                <Label>Kategori ID</Label>
                <Input
                  value={form.hbCategoryId}
                  onChange={(e) => handleChange("hbCategoryId", e.target.value)}
                />

                <Label>Merchant SKU</Label>
                <Input
                  value={form.hbMerchantSku}
                  onChange={(e) => handleChange("hbMerchantSku", e.target.value)}
                />

                <Label>Desi</Label>
                <Input
                  value={form.hbDesi}
                  onChange={(e) => handleChange("hbDesi", e.target.value)}
                />

                <Label>Ağırlık (kg)</Label>
                <Input
                  value={form.hbKg}
                  onChange={(e) => handleChange("hbKg", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* ------------- GÖNDERİM AYARLARI --------------- */}
          <TabsContent value="sync">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  n11: "N11",
                  trendyol: "Trendyol",
                  hepsiburada: "Hepsiburada",
                  amazon: "Amazon",
                  pazarama: "Pazarama",
                  ciceksepeti: "Çiçeksepeti",
                  idefix: "İdefix",
                  pttavm: "PTT AVM",
                }).map(([key, label]) => (
                  <div className="flex items-center gap-3" key={key}>
                    <Switch
                      checked={form.sendTo[key]}
                      onCheckedChange={(v) => handleSendToChange(key, v)}
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6 gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/urunler")}>
            Vazgeç
          </Button>

          <Button type="submit" className="bg-blue-600 text-white">
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
