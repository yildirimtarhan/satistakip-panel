// 📁 /pages/dashboard/urunler/yeni.js
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

export default function NewProductPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ana form state
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

  // ---------------------------
  // N11 Çok Seviyeli Kategori
  // ---------------------------
  const [level1, setLevel1] = useState([]);
  const [level2, setLevel2] = useState([]);
  const [level3, setLevel3] = useState([]);

  const [selectedL1, setSelectedL1] = useState("");
  const [selectedL2, setSelectedL2] = useState("");
  const [selectedL3, setSelectedL3] = useState("");

  // MARKA LİSTESİ
  const [brands, setBrands] = useState([]);

  // Sayfa açıldığında kategori L1 çek
  useEffect(() => {
    loadLevel1();
  }, []);

  // ---------------------------
  // Kategori 1
  // ---------------------------
  const loadLevel1 = async () => {
    try {
      const res = await fetch("/api/n11/categories/list");
      const data = await res.json();

      if (data.success) {
        const cats = data.categories || data.data || [];
        setLevel1(cats);
      }
    } catch (err) {
      console.error("Ana kategori yüklenemedi:", err);
    }
  };

  // ---------------------------
  // Alt kategori yükleme
  // ---------------------------
  const loadSubCategories = async (parentId, setState) => {
    if (!parentId) {
      setState([]);
      return;
    }

    try {
      const res = await fetch(`/api/n11/categories/sub?id=${parentId}`);
      const data = await res.json();

      if (data.success) {
        const list = data.categories || data.data || [];
        setState(list);
      } else {
        setState([]);
      }
    } catch (err) {
      console.error("Alt kategori yüklenemedi:", err);
    }
  };

  // ---------------------------
  // MARKA YÜKLEME (kategoriye göre)
  // ---------------------------
  const loadBrands = async (categoryId) => {
    if (!categoryId) {
      setBrands([]);
      return;
    }

    try {
      const res = await fetch(`/api/n11/category/brands?id=${categoryId}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.brands)) {
        setBrands(data.brands);
      } else {
        setBrands([]);
      }
    } catch (err) {
      console.error("Marka listesi çekilemedi:", err);
      setBrands([]);
    }
  };

  // FORM DEĞİŞİKLİKLERİ
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendToChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sendTo: { ...prev.sendTo, [key]: value },
    }));
  };

  // ---------------------------
  // FORM SUBMIT
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        alert("❌ Oturum bulunamadı.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        modelCode: form.modelCode,
        brand: form.brand,
        category: form.category,
        description: form.description,
        images: form.images.filter((x) => x),

        priceTl: Number(form.priceTl),
        discountPriceTl: Number(form.discountPriceTl),
        vatRate: Number(form.vatRate),

        usdPrice: Number(form.usdPrice),
        eurPrice: Number(form.eurPrice),
        profitMargin: Number(form.profitMargin),
        riskFactor: Number(form.riskFactor),
        fxSource: form.fxSource,
        calculatedPrice: Number(form.priceTl),

        marketplaceSettings: {
          n11: {
            categoryId: form.n11CategoryId,
            brandId: form.n11BrandId,
            preparingDay: Number(form.n11PreparingDay),
            shipmentTemplate: form.n11ShipmentTemplate,
            domestic: !!form.n11Domestic,
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

        sendTo: form.sendTo,
      };

      console.log("🟦 PRODUCT ADD BODY:", payload);

      const res = await fetch("/api/products/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        alert("❌ Ürün kaydedilemedi: " + (data.message || "Hata"));
        setIsSubmitting(false);
        return;
      }

      alert("✔ Ürün başarıyla kaydedildi!");

      router.push("/dashboard/urunler");
    } catch (err) {
      console.error(err);
      alert("❌ Beklenmeyen hata oluştu");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Yeni Ürün Ekle</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Gönderim</TabsTrigger>
          </TabsList>

          {/* ------------------------ */}
          {/* GENEL BİLGİLER */}
          {/* ------------------------ */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>Ürün Adı</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Örn: Lenovo Laptop"
                />
              </div>

              <div>
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                />
              </div>

              <div>
                <Label>Barkod</Label>
                <Input
                  value={form.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                />
              </div>

              <div>
                <Label>Model Kodu</Label>
                <Input
                  value={form.modelCode}
                  onChange={(e) => handleChange("modelCode", e.target.value)}
                />
              </div>

              <div>
                <Label>Marka</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                />
              </div>

              <div>
                <Label>Kategori</Label>
                <Input
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    handleChange("description", e.target.value)
                  }
                  placeholder="Ürün açıklaması..."
                />
              </div>

              {/* CLOUDINARY */}
              <div className="md:col-span-2 space-y-3">
                <Label>Ürün Görselleri</Label>

                <CloudinaryUploader
                  images={form.images}
                  setImages={(imgs) =>
                    setForm((prev) => ({ ...prev, images: imgs }))
                  }
                />

                <Textarea
                  rows={3}
                  value={form.images.join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    setForm((prev) => ({ ...prev, images: lines }));
                  }}
                  placeholder="https://resim1.jpg&#10;https://resim2.jpg"
                />
              </div>
            </div>
          </TabsContent>

          {/* ------------------------ */}
          {/* FİYAT */}
          {/* ------------------------ */}
          <TabsContent value="stockPrice">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">

              <div>
                <Label>Satış Fiyatı (TL)</Label>
                <Input
                  type="number"
                  value={form.priceTl}
                  onChange={(e) => handleChange("priceTl", e.target.value)}
                />
              </div>

              <div>
                <Label>İndirimli Fiyat</Label>
                <Input
                  type="number"
                  value={form.discountPriceTl}
                  onChange={(e) =>
                    handleChange("discountPriceTl", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>KDV (%)</Label>
                <Input
                  type="number"
                  value={form.vatRate}
                  onChange={(e) => handleChange("vatRate", e.target.value)}
                />
              </div>

              <div>
                <Label>USD Fiyat</Label>
                <Input
                  type="number"
                  value={form.usdPrice}
                  onChange={(e) => handleChange("usdPrice", e.target.value)}
                />
              </div>

              <div>
                <Label>EUR Fiyat</Label>
                <Input
                  type="number"
                  value={form.eurPrice}
                  onChange={(e) => handleChange("eurPrice", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* ------------------------ */}
          {/* PAZARYERLERİ AYARLARI */}
          {/* ------------------------ */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* N11 AYARLARI */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>

                {/* Kategori 1 */}
                <div>
                  <Label>N11 Ana Kategori</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={selectedL1}
                    onChange={async (e) => {
                      const val = e.target.value;

                      setSelectedL1(val);
                      setSelectedL2("");
                      setSelectedL3("");

                      setLevel2([]);
                      setLevel3([]);
                      setBrands([]);

                      if (val) {
                        await loadSubCategories(val, setLevel2);
                        handleChange("n11CategoryId", val);

                        // MARKA GETİR (Yeni)
                        loadBrands(val);
                      } else {
                        handleChange("n11CategoryId", "");
                      }
                    }}
                  >
                    <option value="">Kategori Seçiniz</option>
                    {level1.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori 2 */}
                {level2.length > 0 && (
                  <div>
                    <Label>N11 Alt Kategori</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={selectedL2}
                      onChange={async (e) => {
                        const val = e.target.value;

                        setSelectedL2(val);
                        setSelectedL3("");

                        setLevel3([]);
                        setBrands([]);

                        if (val) {
                          await loadSubCategories(val, setLevel3);
                          handleChange("n11CategoryId", val);

                          loadBrands(val);
                        }
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {level2.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Kategori 3 */}
                {level3.length > 0 && (
                  <div>
                    <Label>N11 Alt-Alt Kategori</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={selectedL3}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedL3(val);

                        if (val) {
                          handleChange("n11CategoryId", val);
                          loadBrands(val);
                        }
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {level3.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SEÇİLEN SON KATEGORİ */}
                <p className="text-xs text-gray-600">
                  Seçilen N11 Kategori ID: {form.n11CategoryId || "-"}
                </p>

                {/* MARKA DROPDOWN */}
                <div>
                  <Label>N11 Marka</Label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={form.n11BrandId}
                    onChange={(e) =>
                      handleChange("n11BrandId", e.target.value)
                    }
                  >
                    <option value="">Marka Seçiniz</option>

                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Hazırlık Günü</Label>
                  <Input
                    type="number"
                    value={form.n11PreparingDay}
                    onChange={(e) =>
                      handleChange("n11PreparingDay", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Kargo Şablonu</Label>
                  <Input
                    value={form.n11ShipmentTemplate}
                    onChange={(e) =>
                      handleChange("n11ShipmentTemplate", e.target.value)
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.n11Domestic}
                    onCheckedChange={(val) =>
                      handleChange("n11Domestic", val)
                    }
                  />
                  <Label>Yerli Üretim</Label>
                </div>
              </div>

              {/* TRENDYOL */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">
                  Trendyol Ayarları
                </h2>

                <div>
                  <Label>Kategori ID</Label>
                  <Input
                    value={form.trendyolCategoryId}
                    onChange={(e) =>
                      handleChange("trendyolCategoryId", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Marka ID</Label>
                  <Input
                    value={form.trendyolBrandId}
                    onChange={(e) =>
                      handleChange("trendyolBrandId", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Kargo Firma ID</Label>
                  <Input
                    value={form.trendyolCargoCompanyId}
                    onChange={(e) =>
                      handleChange("trendyolCargoCompanyId", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* HEPSİBURADA */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">
                  Hepsiburada Ayarları
                </h2>

                <div>
                  <Label>Kategori ID</Label>
                  <Input
                    value={form.hbCategoryId}
                    onChange={(e) =>
                      handleChange("hbCategoryId", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Merchant SKU</Label>
                  <Input
                    value={form.hbMerchantSku}
                    onChange={(e) =>
                      handleChange("hbMerchantSku", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Desi</Label>
                  <Input
                    value={form.hbDesi}
                    onChange={(e) =>
                      handleChange("hbDesi", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Ağırlık (KG)</Label>
                  <Input
                    value={form.hbKg}
                    onChange={(e) => handleChange("hbKg", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ------------------------ */}
          {/* PAZARYERİ GÖNDERİM */}
          {/* ------------------------ */}
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
                      onCheckedChange={(val) =>
                        handleSendToChange(key, val)
                      }
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600 border rounded-lg p-3">
                Ürün önce ERP veri tabanına kaydedilecek, ardından
                seçtiğiniz pazaryerlerine otomatik gönderilecek.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/urunler")}
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Gönderimi Başlat"}
          </Button>
        </div>
      </form>
    </div>
  );
}
