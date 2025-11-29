// 📁 /pages/dashboard/urunler/yeni.js
"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewProductPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");

  // 🔹 Ana form state (ileride API'ye göndereceğiz)
  const [form, setForm] = useState({
    // Genel Bilgiler
    name: "",
    sku: "",
    barcode: "",
    modelCode: "",
    brand: "",
    category: "",
    description: "",
    images: [""],

    // Stok & Fiyat
    priceTl: "",
    discountPriceTl: "",
    vatRate: 20,
    currency: "TRY",

    usdPrice: "",
    eurPrice: "",
    profitMargin: 20,
    riskFactor: 1.05,
    fxSource: "tcmb",

    // Pazaryeri Ayarları (temel alanlar)
    n11CategoryId: "",
    n11BrandId: "",
    n11PreparingDay: 3,
    n11ShipmentTemplate: "",
    n11Domestic: true,

    trendyolCategoryId: "",
    trendyolBrandId: "",
    trendyolCargoCompanyId: "",

    hbCategoryId: "",
    hbMerchantSku: "",
    hbDesi: "",
    hbKg: "",

    // Gönderim seçenekleri
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

  // 🔥 Kur bazlı fiyat hesaplama (çok basit demo, sonra geliştiririz)
  const handleFxCalculate = () => {
    const base =
      (Number(form.usdPrice || 0) || 0) * 30 + // TODO: gerçek kuru API'den çek
      (Number(form.eurPrice || 0) || 0) * 32;

    if (!base) return;

    const risk = Number(form.riskFactor || 1);
    const margin = Number(form.profitMargin || 0) / 100;

    const finalPrice = base * risk * (1 + margin);

    setForm((prev) => ({
      ...prev,
      priceTl: finalPrice.toFixed(2),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // TODO: /api/products/add endpoint’ine POST atılacak
      // örnek:
      // const res = await fetch("/api/products/add", { method: "POST", body: JSON.stringify(form), headers: {"Content-Type":"application/json"} });
      // const data = await res.json();

      console.log("Gönderilecek form:", form);
      alert("Şimdilik sadece console.log yapıyoruz. Backend'e bağladığımızda burayı aktif edeceğiz.");
      // router.push("/dashboard/urunler");
    } catch (err) {
      console.error("Ürün kaydetme hatası:", err);
      alert("Ürün kaydedilirken hata oluştu.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Yeni Ürün Ekle</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
            <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
            <TabsTrigger value="sync">Pazaryerlerine Gönder</TabsTrigger>
          </TabsList>

          {/* TAB 1 — GENEL BİLGİLER */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <Label>Ürün Adı</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Örn: Lenovo ThinkPad T14"
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
                  placeholder="Üretici model kodu"
                />
              </div>

              <div>
                <Label>Marka</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="Örn: Lenovo"
                />
              </div>
              <div>
                <Label>ERP Kategori</Label>
                <Input
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder="Laptop / Bilgisayar / Elektronik"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Ürün açıklamasını buraya girin..."
                />
              </div>

              <div className="md:col-span-2">
                <Label>Görsel URL (şimdilik tek alan, sonra çoklu yaparız)</Label>
                <Input
                  value={form.images[0]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      images: [e.target.value],
                    }))
                  }
                  placeholder="https://...jpg"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2 — STOK & FİYAT */}
          <TabsContent value="stockPrice">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
              {/* TL FİYAT BLOĞU */}
              <div className="space-y-3 border rounded-lg p-3">
                <h2 className="font-semibold text-sm">TL Fiyatlandırma</h2>
                <div>
                  <Label>Satış Fiyatı (TL)</Label>
                  <Input
                    type="number"
                    value={form.priceTl}
                    onChange={(e) => handleChange("priceTl", e.target.value)}
                    placeholder="Örn: 599.90"
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
                    placeholder="İsteğe bağlı"
                  />
                </div>
                <div>
                  <Label>KDV Oranı (%)</Label>
                  <Input
                    type="number"
                    value={form.vatRate}
                    onChange={(e) => handleChange("vatRate", e.target.value)}
                    placeholder="Örn: 20"
                  />
                </div>
              </div>

              {/* DÖVİZ FİYAT BLOĞU */}
              <div className="space-y-3 border rounded-lg p-3">
                <h2 className="font-semibold text-sm">Döviz Bazlı Hesaplama</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>USD Fiyat</Label>
                    <Input
                      type="number"
                      value={form.usdPrice}
                      onChange={(e) =>
                        handleChange("usdPrice", e.target.value)
                      }
                      placeholder="Örn: 10"
                    />
                  </div>
                  <div>
                    <Label>EUR Fiyat</Label>
                    <Input
                      type="number"
                      value={form.eurPrice}
                      onChange={(e) =>
                        handleChange("eurPrice", e.target.value)
                      }
                      placeholder="Opsiyonel"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kar Marjı (%)</Label>
                    <Input
                      type="number"
                      value={form.profitMargin}
                      onChange={(e) =>
                        handleChange("profitMargin", e.target.value)
                      }
                      placeholder="Örn: 20"
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
                      placeholder="Örn: 1.05"
                    />
                  </div>
                </div>
                <div>
                  <Label>Döviz Kaynağı</Label>
                  <select
                    className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                    value={form.fxSource}
                    onChange={(e) => handleChange("fxSource", e.target.value)}
                  >
                    <option value="tcmb">TCMB</option>
                    <option value="serbest">Serbest Piyasa</option>
                    <option value="sabit">Sabit Kur</option>
                    <option value="tamponlu">Tamponlu (+%5)</option>
                  </select>
                </div>
                <Button type="button" onClick={handleFxCalculate}>
                  Kur Bazlı Fiyatı Hesapla ve TL Alanına Yaz
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3 — PAZARYERİ AYARLARI */}
          <TabsContent value="marketplaces">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* N11 */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>
                <div>
                  <Label>N11 Kategori ID</Label>
                  <Input
                    value={form.n11CategoryId}
                    onChange={(e) =>
                      handleChange("n11CategoryId", e.target.value)
                    }
                    placeholder="Örn: 1000476"
                  />
                </div>
                <div>
                  <Label>N11 Marka ID</Label>
                  <Input
                    value={form.n11BrandId}
                    onChange={(e) =>
                      handleChange("n11BrandId", e.target.value)
                    }
                    placeholder="N11 marka ID"
                  />
                </div>
                <div>
                  <Label>Preparing Day</Label>
                  <Input
                    type="number"
                    value={form.n11PreparingDay}
                    onChange={(e) =>
                      handleChange("n11PreparingDay", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Kargo Template</Label>
                  <Input
                    value={form.n11ShipmentTemplate}
                    onChange={(e) =>
                      handleChange("n11ShipmentTemplate", e.target.value)
                    }
                    placeholder="N11 kargo şablon adı / ID"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    checked={form.n11Domestic}
                    onCheckedChange={(val) =>
                      handleChange("n11Domestic", val)
                    }
                  />
                  <Label>Domestic (Yurtiçi ürün)</Label>
                </div>
              </div>

              {/* Trendyol */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h2 className="font-semibold text-sm mb-2">Trendyol Ayarları</h2>
                <div>
                  <Label>Trendyol Kategori ID</Label>
                  <Input
                    value={form.trendyolCategoryId}
                    onChange={(e) =>
                      handleChange("trendyolCategoryId", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Trendyol Marka ID</Label>
                  <Input
                    value={form.trendyolBrandId}
                    onChange={(e) =>
                      handleChange("trendyolBrandId", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Kargo Firması ID</Label>
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
                <h2 className="font-semibold text-sm mb-2">Hepsiburada Ayarları</h2>
                <div>
                  <Label>HB Kategori ID</Label>
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
                    onChange={(e) => handleChange("hbDesi", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Kilogram</Label>
                  <Input
                    value={form.hbKg}
                    onChange={(e) => handleChange("hbKg", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4 — PAZARYERLERİNE GÖNDER */}
          <TabsContent value="sync">
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
              <h2 className="font-semibold text-sm mb-2">
                Pazaryerlerine Gönderim Tercihleri
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ["n11", "N11"],
                  ["trendyol", "Trendyol"],
                  ["hepsiburada", "Hepsiburada"],
                  ["pazarama", "Pazarama"],
                  ["amazon", "Amazon"],
                  ["ciceksepeti", "ÇiçekSepeti"],
                  ["idefix", "İdefix"],
                  ["pttavm", "PTT AVM"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
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

              {/* Buraya ileride: pazaryeri status tablosu eklenecek */}
              <div className="mt-4 border rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium mb-1">
                  Not:
                </p>
                <p>
                  Kaydettiğinizde ürün önce ERP'ye yazılacak, ardından
                  işaretlediğiniz pazaryerlerine otomatik gönderilecek.
                  Sonraki adımda buraya N11 / Trendyol / HB onay durumlarını
                  gösteren bir tablo ekleyeceğiz.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/urunler")}
          >
            Vazgeç
          </Button>
          <Button type="submit">Kaydet ve Gönderimi Başlat</Button>
        </div>
      </form>
    </div>
  );
}
