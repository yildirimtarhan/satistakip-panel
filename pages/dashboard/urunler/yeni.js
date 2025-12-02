"use client";

import { useState } from "react";
import { useRouter } from "next/router";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import ImageUploader from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    images: [""],

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
      pazarama: false,
      amazon: false,
      ciceksepeti: false,
      idefix: false,
      pttavm: false,
    },
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendToChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sendTo: { ...prev.sendTo, [key]: value },
    }));
  };

  // 🔥 Artık sadece buton tıklamasıyla çalışacak submit
  const handleSubmit = async () => {
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

      // API PAYLOAD
      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        modelCode: form.modelCode,
        brand: form.brand,
        category: form.category,
        description: form.description,
        images: form.images.filter((x) => x.trim() !== ""),

        stock: 0,
        priceTl: Number(form.priceTl || 0),
        discountPriceTl: Number(form.discountPriceTl || 0),
        vatRate: Number(form.vatRate || 20),

        usdPrice: Number(form.usdPrice || 0),
        eurPrice: Number(form.eurPrice || 0),
        profitMargin: Number(form.profitMargin || 20),
        riskFactor: Number(form.riskFactor || 1.05),
        fxSource: form.fxSource,
        calculatedPrice: Number(form.priceTl || 0),

        marketplaceSettings: {
          n11: {
            categoryId: form.n11CategoryId,
            brandId: form.n11BrandId,
            preparingDay: Number(form.n11PreparingDay),
            shipmentTemplate: form.n11ShipmentTemplate,
            domestic: !!form.n11Domestic,
            attributes: {},
          },
          trendyol: {
            categoryId: form.trendyolCategoryId,
            brandId: form.trendyolBrandId,
            cargoCompanyId: form.trendyolCargoCompanyId,
            attributes: {},
          },
          hepsiburada: {
            categoryId: form.hbCategoryId,
            merchantSku: form.hbMerchantSku,
            desi: form.hbDesi,
            kg: form.hbKg,
            attributes: {},
          },
          amazon: {
            category: "",
            bulletPoints: [],
            searchTerms: [],
            hsCode: "",
            attributes: {},
          },
          ciceksepeti: { categoryId: "", attributes: {} },
          pazarama: { categoryId: "", attributes: {} },
          idefix: { categoryId: "", attributes: {} },
          pttavm: { categoryId: "", attributes: {} },
        },

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
        alert("❌ Ürün kaydedilemedi: " + (data.message || "Bilinmeyen Hata"));
        setIsSubmitting(false);
        return;
      }

      alert("✔ Ürün başarıyla ERP'ye kaydedildi!");

      setTimeout(() => {
        router.push("/dashboard/urunler");
      }, 300);
    } catch (err) {
      console.error("NEW PRODUCT ERROR:", err);
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

      {/* ❗ Artık <form> yok, sadece div → browser otomatik submit edemez */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* TAB MENÜSÜ */}
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Pazaryerlerine Gönder</TabsTrigger>
          </TabsList>

          {/* -------------- GENEL -------------- */}
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
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Görsel URL</Label>
                <Input
                  value={form.images[0]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      images: [e.target.value],
                    }))
                  }
                  placeholder="https://image.jpg"
                />
              </div>
            </div>
          </TabsContent>

          {/* -------------- STOK & FİYAT -------------- */}
          <TabsContent value="stockPrice">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>Satış Fiyatı (TL)</Label>
                <Input
                  value={form.priceTl}
                  onChange={(e) => handleChange("priceTl", e.target.value)}
                />
              </div>

              <div>
                <Label>İndirimli Fiyat (TL)</Label>
                <Input
                  value={form.discountPriceTl}
                  onChange={(e) =>
                    handleChange("discountPriceTl", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>KDV Oranı (%)</Label>
                <Input
                  value={form.vatRate}
                  onChange={(e) => handleChange("vatRate", e.target.value)}
                />
              </div>

              <div>
                <Label>USD Fiyat</Label>
                <Input
                  value={form.usdPrice}
                  onChange={(e) => handleChange("usdPrice", e.target.value)}
                />
              </div>

              <div>
                <Label>EUR Fiyat</Label>
                <Input
                  value={form.eurPrice}
                  onChange={(e) => handleChange("eurPrice", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* -------------- PAZARYERİ AYARLARI -------------- */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>N11 Kategori ID</Label>
                <Input
                  value={form.n11CategoryId}
                  onChange={(e) =>
                    handleChange("n11CategoryId", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>N11 Marka ID</Label>
                <Input
                  value={form.n11BrandId}
                  onChange={(e) =>
                    handleChange("n11BrandId", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>N11 Hazırlık Günü</Label>
                <Input
                  value={form.n11PreparingDay}
                  onChange={(e) =>
                    handleChange("n11PreparingDay", e.target.value)
                  }
                />
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={form.n11Domestic}
                  onCheckedChange={(val) =>
                    handleChange("n11Domestic", val)
                  }
                />
                <Label>Yerli Üretim</Label>
              </div>
            </div>
          </TabsContent>

          {/* -------------- PAZARYERİNE GÖNDER -------------- */}
          <TabsContent value="sync">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* 🔥 Artık sadece bu buton tetikliyor */}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Gönderimi Başlat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
