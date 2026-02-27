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
import { N11_SHIPMENT_TEMPLATE_OPTIONS, N11_SHIPMENT_TEMPLATE_CUSTOM_KEY } from "@/constants/n11ShipmentTemplates";

export default function NewProductPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ana Form State
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

  // N11 çok seviyeli kategori seçim state'leri
  const [level1, setLevel1] = useState([]); // Ana kategoriler
  const [level2, setLevel2] = useState([]); // 2. seviye
  const [level3, setLevel3] = useState([]); // 3. seviye

  const [selectedL1, setSelectedL1] = useState("");
  const [selectedL2, setSelectedL2] = useState("");
  const [selectedL3, setSelectedL3] = useState("");

  // N11 marka listesi
  const [brands, setBrands] = useState([]);

  // Sayfa açıldığında N11 kategori & marka verilerini çek
  useEffect(() => {
    loadLevel1();
    // Marka listesi kategoriye göre çalışıyor, o yüzden burada global çağırmıyoruz
  }, []);

  const loadLevel1 = async () => {
    try {
      const res = await fetch("/api/n11/categories/list");
      const data = await res.json();

      if (data.success && Array.isArray(data.categories)) {
        setLevel1(data.categories);
      } else if (data.success && Array.isArray(data.data)) {
        setLevel1(data.data);
      } else {
        setLevel1([]);
      }
    } catch (err) {
      console.error("N11 ana kategori yüklenemedi:", err);
    }
  };

  const loadSubCategories = async (parentId, setLevelFn) => {
    if (!parentId) {
      setLevelFn([]);
      return;
    }

    try {
      const res = await fetch(`/api/n11/categories/sub?id=${parentId}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.categories)) {
        setLevelFn(data.categories);
      } else if (data.success && Array.isArray(data.data)) {
        setLevelFn(data.data);
      } else {
        setLevelFn([]);
      }
    } catch (err) {
      console.error("N11 alt kategori yüklenemedi:", err);
      setLevelFn([]);
    }
  };

  // 🔥 Kategoriye göre N11 marka listesi
  // 🔥 N11 Marka listesi yükle
  // 🔥 N11 Marka listesi yükle
const loadBrandsByCategory = async (categoryId) => {
  try {
    const token = localStorage.getItem("token");

    // Yeni backend yapısına uygun endpoint
     
    const res = await fetch(`/api/n11/brands?categoryId=${categoryId}`, {
  headers: { Authorization: `Bearer ${token}` },
});


    const data = await res.json();

    // Hem data.brands hem data.data olasılıklarını yönetiyoruz
    if (data.success) {
      if (Array.isArray(data.brands)) {
        setBrands(data.brands);
      } else if (Array.isArray(data.data)) {
        setBrands(data.data);
      } else {
        setBrands([]);
      }
    } else {
      setBrands([]);
    }
  } catch (err) {
    console.error("N11 marka listesi çekilemedi:", err);
    setBrands([]);
  }
};


  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendToChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sendTo: { ...prev.sendTo, [key]: value },
    }));
  };

  // 🔥 Backend'e giden gerçek payload
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        alert("❌ Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        // GENEL
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        modelCode: form.modelCode,
        brand: form.brand,
        category: form.category,
        description: form.description,
        images: form.images.filter((x) => x && x.trim() !== ""),

        // STOK & FİYAT
        stock: 0,
        priceTl: Number(form.priceTl || 0),
        discountPriceTl: Number(form.discountPriceTl || 0),
        vatRate: Number(form.vatRate || 20),

        usdPrice: Number(form.usdPrice || 0),
        eurPrice: Number(form.eurPrice || 0),
        profitMargin: Number(form.profitMargin || 20),
        riskFactor: Number(form.riskFactor || 1.05),
        fxSource: form.fxSource || "tcmb",
        calculatedPrice: Number(form.priceTl || 0),

        // PAZARYERİ AYARLARI
        marketplaceSettings: {
          n11: {
            categoryId: form.n11CategoryId || "",
            brandId: form.n11BrandId || "",
            preparingDay: Number(form.n11PreparingDay || 3),
            shipmentTemplate: form.n11ShipmentTemplate || "",
            domestic: !!form.n11Domestic,
            attributes: {},
          },
          trendyol: {
            categoryId: form.trendyolCategoryId || "",
            brandId: form.trendyolBrandId || "",
            cargoCompanyId: form.trendyolCargoCompanyId || "",
            attributes: {},
          },
          hepsiburada: {
            categoryId: form.hbCategoryId || "",
            merchantSku: form.hbMerchantSku || "",
            desi: form.hbDesi || "",
            kg: form.hbKg || "",
            attributes: {},
          },
          amazon: {
            category: "",
            bulletPoints: [],
            searchTerms: [],
            hsCode: "",
            attributes: {},
          },
          ciceksepeti: {
            categoryId: "",
            attributes: {},
          },
          pazarama: {
            categoryId: "",
            attributes: {},
          },
          idefix: {
            categoryId: "",
            attributes: {},
          },
          pttavm: {
            categoryId: "",
            attributes: {},
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

    if (!res.ok || data.success === false) {
      alert("❌ Ürün kaydedilemedi: " + (data.message || "Bilinmeyen Hata"));
      setIsSubmitting(false);
      return;
    }

    alert("✅ Ürün başarıyla ERP'ye kaydedildi!");

    const createdProductId = data?.product?._id;

    // ✅ N11 seçildiyse otomatik gönder
    if (createdProductId && form?.sendTo?.n11) {
      try {
        const sendRes = await fetch("/api/n11/products/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: createdProductId }),
        });

        const sendData = await sendRes.json().catch(() => ({}));

        if (!sendRes.ok || sendData.success === false) {
          alert(`❌ N11 gönderim hatası:\n${sendData.message || "Bilinmeyen hata"}`);
        } else {
          alert(`✅ N11 gönderimi kuyruğa alındı!\nTaskId: ${sendData.taskId}`);
        }
      } catch (err) {
        console.error("N11 otomatik gönderim hatası:", err);
        alert("❌ N11 otomatik gönderim hatası (console kontrol et)");
      }
    }

    setIsSubmitting(false);
  } catch (err) {
    console.error("handleSubmit error:", err);
    alert("❌ Bir hata oluştu (console kontrol et)");
    setIsSubmitting(false);
  }
};

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Yeni Ürün Ekle</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>

      {/* Enter → barkod okuma sırasında otomatik submit ENGELLENDİ */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            e.target.tagName !== "TEXTAREA" &&
            e.target.type !== "submit"
          ) {
            e.preventDefault();
          }
        }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok &amp; Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Pazaryerlerine Gönder</TabsTrigger>
          </TabsList>

          {/* GENEL BİLGİLER */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>Ürün Adı</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Örn: Lenovo ThinkPad"
                />
              </div>

              <div>
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="ERP içi kod"
                />
              </div>

              <div>
                <Label>Barkod</Label>
                <Input
                  value={form.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  placeholder="13 haneli barkod"
                />
              </div>

              <div>
                <Label>Model Kodu</Label>
                <Input
                  value={form.modelCode}
                  onChange={(e) =>
                    handleChange("modelCode", e.target.value)
                  }
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
                  placeholder="Ürün açıklamasını girin..."
                />
              </div>

              {/* 🔥 Cloudinary + Çoklu URL Destekli Görsel Alanı */}
              <div className="md:col-span-2 space-y-3">
                <Label>Ürün Görselleri</Label>

                {/* Cloudinary Uploader */}
                <CloudinaryUploader
                  images={form.images}
                  setImages={(imgs) =>
                    setForm((prev) => ({
                      ...prev,
                      images: imgs,
                    }))
                  }
                />

                <Label className="text-sm text-gray-600">
                  Veya URL ile ekleyin (her satıra bir görsel):
                </Label>
                <Textarea
                  rows={3}
                  value={form.images.join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    setForm((prev) => ({
                      ...prev,
                      images: lines,
                    }));
                  }}
                  placeholder={"https://resim1.jpg\nhttps://resim2.jpg"}
                />
              </div>
            </div>
          </TabsContent>

          {/* STOK & FİYAT */}
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
                <Label>İndirimli Fiyat (TL)</Label>
                <Input
                  type="number"
                  value={form.discountPriceTl}
                  onChange={(e) =>
                    handleChange("discountPriceTl", e.target.value)
                  }
                />
              </div>

              <div>
  <Label>KDV Oranı (%)</Label>

  <select
    className="w-full border rounded-lg p-2"
    value={form.vatRate}
    onChange={(e) => handleChange("vatRate", Number(e.target.value))}
  >
    <option value={0}>%0</option>
    <option value={1}>%1</option>
    <option value={8}>%8</option>
    <option value={10}>%10</option>
    <option value={18}>%18</option>
    <option value={20}>%20</option>
  </select>
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

          {/* PAZARYERİ AYARLARI */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* N11 */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>

                {/* Çok seviyeli N11 kategori seçimi */}
                <div className="space-y-3">
                  <div>
                    <Label>N11 Ana Kategori</Label>
                    <select
                      className="w-full border rounded-lg p-2"
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
                          await loadBrandsByCategory(val);
                        } else {
                          handleChange("n11CategoryId", "");
                        }
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {level1.map((cat) => (
                        <option
                          key={cat.id || cat.categoryId}
                          value={cat.id || cat.categoryId}
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {level2.length > 0 && (
                    <div>
                      <Label>N11 Alt Kategori</Label>
                      <select
                        className="w-full border rounded-lg p-2"
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
                            await loadBrandsByCategory(val);
                          } else if (selectedL1) {
                            handleChange("n11CategoryId", selectedL1);
                            await loadBrandsByCategory(selectedL1);
                          } else {
                            handleChange("n11CategoryId", "");
                          }
                        }}
                      >
                        <option value="">Seçiniz</option>
                        {level2.map((cat) => (
                          <option
                            key={cat.id || cat.categoryId}
                            value={cat.id || cat.categoryId}
                          >
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {level3.length > 0 && (
                    <div>
                      <Label>N11 Alt-Alt Kategori</Label>
                      <select
                        className="w-full border rounded-lg p-2"
                        value={selectedL3}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSelectedL3(val);

                          if (val) {
                            handleChange("n11CategoryId", val);
                            await loadBrandsByCategory(val);
                          } else if (selectedL2) {
                            handleChange("n11CategoryId", selectedL2);
                            await loadBrandsByCategory(selectedL2);
                          } else if (selectedL1) {
                            handleChange("n11CategoryId", selectedL1);
                            await loadBrandsByCategory(selectedL1);
                          } else {
                            handleChange("n11CategoryId", "");
                            setBrands([]);
                          }
                        }}
                      >
                        <option value="">Seçiniz</option>
                        {level3.map((cat) => (
                          <option
                            key={cat.id || cat.categoryId}
                            value={cat.id || cat.categoryId}
                          >
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    Seçilen kategori ID: {form.n11CategoryId || "-"}
                  </p>
                </div>

                {/* N11 Marka Dropdown (Kategoriye göre) */}
                <div>
                  <Label>N11 Marka</Label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={form.n11BrandId || ""}
                    onChange={(e) => handleChange("n11BrandId", e.target.value)}
                  >
                    <option value="">Marka seçiniz</option>
                    {brands.map((b) => (
                      <option
                        key={b.id || b.brandId}
                        value={b.id || b.brandId}
                      >
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>N11 Hazırlık Günü</Label>
                  <Input
                    type="number"
                    value={form.n11PreparingDay}
                    onChange={(e) =>
                      handleChange("n11PreparingDay", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>N11 Teslimat (Kargo) Şablonu</Label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={
                      N11_SHIPMENT_TEMPLATE_OPTIONS.some((o) => o.value === form.n11ShipmentTemplate)
                        ? form.n11ShipmentTemplate
                        : form.n11ShipmentTemplate
                          ? N11_SHIPMENT_TEMPLATE_CUSTOM_KEY
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      handleChange(
                        "n11ShipmentTemplate",
                        v === N11_SHIPMENT_TEMPLATE_CUSTOM_KEY ? (form.n11ShipmentTemplate || "") : v
                      );
                    }}
                  >
                    {N11_SHIPMENT_TEMPLATE_OPTIONS.map((o) => (
                      <option key={o.value || "empty"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {!N11_SHIPMENT_TEMPLATE_OPTIONS.some((o) => o.value === form.n11ShipmentTemplate) &&
                    form.n11ShipmentTemplate !== "" && (
                    <Input
                      className="mt-1"
                      placeholder="N11 panelindeki şablon adı"
                      value={form.n11ShipmentTemplate}
                      onChange={(e) => handleChange("n11ShipmentTemplate", e.target.value)}
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Hesabım → Teslimat Bilgilerimiz ile aynı olmalı</p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={form.n11Domestic}
                    onCheckedChange={(val) =>
                      handleChange("n11Domestic", val)
                    }
                  />
                  <Label>Yerli Üretim</Label>
                </div>
              </div>

              {/* Trendyol */}
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

              {/* Hepsiburada */}
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
                  <Label>Ağırlık (kg)</Label>
                  <Input
                    value={form.hbKg}
                    onChange={(e) =>
                      handleChange("hbKg", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PAZARYERLERİNE GÖNDER */}
          <TabsContent value="sync">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  n11: "N11",
                  trendyol: "Trendyol",
                  hepsiburada: "Hepsiburada",
                  amazon: "Amazon",
                  ciceksepeti: "Çiçeksepeti",
                  pazarama: "Pazarama",
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

              <div className="mt-4 border rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium mb-1">Bilgi:</p>
                <p>
                  Ürün önce ERP veri tabanına kaydedilecek, ardından
                  işaretlediğiniz pazaryerlerine otomatik aktarılacaktır.
                  Bir sonraki adımda buraya N11 / Trendyol / HB onay
                  durumlarını gösteren bir "durum tablosu" eklenecek.
                </p>
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
