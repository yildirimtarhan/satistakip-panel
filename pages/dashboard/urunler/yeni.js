// 📁 /pages/dashboard/urunler/yeni.js
"use client";

import { useState } from "react";
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

export default function NewProductPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Ana Form State
  const [form, setForm] = useState({
    // Genel bilgiler
    name: "",
    sku: "",
    barcode: "",
    modelCode: "",
    brand: "",
    category: "",
    description: "",
    images: [],          // Çoklu görsel URL listesi
    imagesText: "",      // Textarea'da satır satır URL'ler

    // Stok & fiyat
    stock: 0,
    priceTl: "",
    discountPriceTl: "",
    vatRate: 20,

    usdPrice: "",
    eurPrice: "",
    profitMargin: 20,
    riskFactor: 1.05,
    fxSource: "tcmb",

    // Pazaryeri ayarları
    marketplaceSettings: {
      n11: {
        categoryId: "",
        brandId: "",
        preparingDay: 3,
        shipmentTemplate: "",
        domestic: true,
        attributes: {},
      },
      trendyol: {
        categoryId: "",
        brandId: "",
        cargoCompanyId: "",
        attributes: {},
      },
      hepsiburada: {
        categoryId: "",
        merchantSku: "",
        desi: "",
        kg: "",
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

    // Hangi pazaryerlerine gönderilsin?
    sendTo: {
      n11: false,
      trendyol: false,
      hepsiburada: false,
      pazarama: false,
      amazon: false,
      ciceksepeti: false,
      idefix: false,
      pttavm: false,
    },
  });

  // 🔹 Genel field değişimi
  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 🔹 Pazaryeri ayarları değişimi
  const handleMarketplaceChange = (marketplace, field, value) => {
    setForm((prev) => ({
      ...prev,
      marketplaceSettings: {
        ...prev.marketplaceSettings,
        [marketplace]: {
          ...prev.marketplaceSettings[marketplace],
          [field]: value,
        },
      },
    }));
  };

  // 🔹 Pazaryerine gönder switch
  const handleSendToChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sendTo: {
        ...prev.sendTo,
        [key]: value,
      },
    }));
  };

  // 🔹 Görsel Textarea değişimi → satır satır array'e çeviriyoruz
  const handleImagesTextChange = (value) => {
    const lines = value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    setForm((prev) => ({
      ...prev,
      imagesText: value,
      images: lines,
    }));
  };

  // 🔥 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      if (!token) {
        alert("❌ Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setIsSubmitting(false);
        return;
      }

      // ✅ API'ye gidecek payload
      const payload = {
        // Genel bilgiler
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        modelCode: form.modelCode,
        brand: form.brand,
        category: form.category,
        description: form.description,
        images: form.images, // Satır satır URL listesi

        // Stok & fiyat
        stock: Number(form.stock || 0),
        priceTl: Number(form.priceTl || 0),
        discountPriceTl: Number(form.discountPriceTl || 0),
        vatRate: Number(form.vatRate || 20),

        usdPrice: Number(form.usdPrice || 0),
        eurPrice: Number(form.eurPrice || 0),
        profitMargin: Number(form.profitMargin || 20),
        riskFactor: Number(form.riskFactor || 1.05),
        fxSource: form.fxSource || "tcmb",
        calculatedPrice: Number(form.priceTl || 0),

        marketplaceSettings: form.marketplaceSettings,
        sendTo: form.sendTo,
      };

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
        alert("❌ Ürün kaydedilemedi: " + (data.message || "Bilinmeyen hata"));
        setIsSubmitting(false);
        return;
      }

      alert("✔ Ürün başarıyla ERP'ye kaydedildi.");

      // Formu sıfırla ve listeye dön
      setTimeout(() => {
        router.push("/dashboard/urunler");
      }, 400);
    } catch (err) {
      console.error("Yeni ürün ekleme hatası:", err);
      alert("❌ Beklenmeyen bir hata oluştu.");
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

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Enter'a basınca rastgele submit olmasın
          if (e.key === "Enter") {
            const tag = e.target.tagName.toLowerCase();
            if (tag !== "textarea") e.preventDefault();
          }
        }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* TAB MENÜSÜ */}
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok &amp; Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Pazaryerine Gönder</TabsTrigger>
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
                  placeholder="ERP içi stok kodu"
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
                />
              </div>

              <div className="md:col-span-2">
                <Label>
                  Görsel URL’leri
                  <span className="ml-1 text-xs text-gray-500">
                    (Her satıra bir URL yazın – birden fazla resim desteklenir)
                  </span>
                </Label>
                <Textarea
                  rows={4}
                  value={form.imagesText}
                  onChange={(e) => handleImagesTextChange(e.target.value)}
                  placeholder={
                    "https://.../resim1.jpg\nhttps://.../resim2.jpg\nhttps://.../resim3.jpg"
                  }
                />
                {form.images.length > 0 && (
                  <p className="mt-1 text-xs text-green-600">
                    Toplam {form.images.length} görsel eklendi.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* STOK & FİYAT */}
          <TabsContent value="stockPrice">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>Stok Adedi</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
                />
              </div>

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

              <div>
                <Label>Kar Marjı (%)</Label>
                <Input
                  type="number"
                  value={form.profitMargin}
                  onChange={(e) =>
                    handleChange("profitMargin", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Risk Faktörü</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.riskFactor}
                  onChange={(e) =>
                    handleChange("riskFactor", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Döviz Kaynağı</Label>
                <Input
                  value={form.fxSource}
                  onChange={(e) => handleChange("fxSource", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* PAZARYERLERİ AYARLARI */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* N11 */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>

                <Label>Kategori ID</Label>
                <Input
                  value={form.marketplaceSettings.n11.categoryId}
                  onChange={(e) =>
                    handleMarketplaceChange("n11", "categoryId", e.target.value)
                  }
                />

                <Label>Marka ID</Label>
                <Input
                  value={form.marketplaceSettings.n11.brandId}
                  onChange={(e) =>
                    handleMarketplaceChange("n11", "brandId", e.target.value)
                  }
                />

                <Label>Hazırlık Günü</Label>
                <Input
                  type="number"
                  value={form.marketplaceSettings.n11.preparingDay}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "n11",
                      "preparingDay",
                      e.target.value
                    )
                  }
                />

                <Label>Kargo Şablonu</Label>
                <Input
                  value={form.marketplaceSettings.n11.shipmentTemplate}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "n11",
                      "shipmentTemplate",
                      e.target.value
                    )
                  }
                />

                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={form.marketplaceSettings.n11.domestic}
                    onCheckedChange={(val) =>
                      handleMarketplaceChange("n11", "domestic", val)
                    }
                  />
                  <Label>Yerli Üretim</Label>
                </div>
              </div>

              {/* Trendyol */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">Trendyol Ayarları</h2>

                <Label>Kategori ID</Label>
                <Input
                  value={form.marketplaceSettings.trendyol.categoryId}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "trendyol",
                      "categoryId",
                      e.target.value
                    )
                  }
                />

                <Label>Marka ID</Label>
                <Input
                  value={form.marketplaceSettings.trendyol.brandId}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "trendyol",
                      "brandId",
                      e.target.value
                    )
                  }
                />

                <Label>Kargo Firma ID</Label>
                <Input
                  value={form.marketplaceSettings.trendyol.cargoCompanyId}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "trendyol",
                      "cargoCompanyId",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* Hepsiburada */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">
                  Hepsiburada Ayarları
                </h2>

                <Label>Kategori ID</Label>
                <Input
                  value={form.marketplaceSettings.hepsiburada.categoryId}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "hepsiburada",
                      "categoryId",
                      e.target.value
                    )
                  }
                />

                <Label>Merchant SKU</Label>
                <Input
                  value={form.marketplaceSettings.hepsiburada.merchantSku}
                  onChange={(e) =>
                    handleMarketplaceChange(
                      "hepsiburada",
                      "merchantSku",
                      e.target.value
                    )
                  }
                />

                <Label>Desi</Label>
                <Input
                  value={form.marketplaceSettings.hepsiburada.desi}
                  onChange={(e) =>
                    handleMarketplaceChange("hepsiburada", "desi", e.target.value)
                  }
                />

                <Label>Ağırlık (kg)</Label>
                <Input
                  value={form.marketplaceSettings.hepsiburada.kg}
                  onChange={(e) =>
                    handleMarketplaceChange("hepsiburada", "kg", e.target.value)
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* PAZARYERİNE GÖNDER */}
          <TabsContent value="sync">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              {Object.keys(form.sendTo).map((key) => (
                <div className="flex items-center gap-3" key={key}>
                  <Switch
                    checked={form.sendTo[key]}
                    onCheckedChange={(val) => handleSendToChange(key, val)}
                  />
                  <Label className="capitalize">{key}</Label>
                </div>
              ))}
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
