// 📁 /pages/dashboard/urunler/[id].js
"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("general");

  const [form, setForm] = useState(null);

  // 🔄 Ürün Bilgisi Çek
  useEffect(() => {
    if (!id) return;
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/products/get?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ürün bulunamadı");
        return;
      }

      setForm(data.product);
      setLoading(false);
    } catch (err) {
      console.error("Ürün çekme hatası:", err);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleMarketplaceChange = (mp, key, value) => {
    setForm((prev) => ({
      ...prev,
      marketplaceSettings: {
        ...prev.marketplaceSettings,
        [mp]: {
          ...prev.marketplaceSettings[mp],
          [key]: value,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/products/update?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Kaydedilemedi!");
      } else {
        alert("Ürün başarıyla güncellendi!");
        router.push("/dashboard/urunler");
      }
    } catch (err) {
      alert("Bir hata oluştu");
      console.error(err);
    }

    setSaving(false);
  };

  if (loading || !form) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Ürünü Düzenle</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
          <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
          <TabsTrigger value="sync">Gönderim Durumu</TabsTrigger>
        </TabsList>

        {/* -------------------- GENEL -------------------- */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div>
              <Label>Ürün Adı</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
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
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Görsel URL</Label>
              <Input
                value={form.images?.[0] || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    images: [e.target.value],
                  }))
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* -------------------- STOK & FİYAT -------------------- */}
        <TabsContent value="stockPrice">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div>
              <Label>Stok</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
              />
            </div>

            <div>
              <Label>Fiyat (TL)</Label>
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
              <Label>KDV</Label>
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

        {/* -------------------- PAZARYERİ AYARLARI -------------------- */}
        <TabsContent value="marketplaces">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* N11 */}
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
              <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>

              <Label>Kategori ID</Label>
              <Input
                value={form.marketplaceSettings?.n11?.categoryId}
                onChange={(e) =>
                  handleMarketplaceChange("n11", "categoryId", e.target.value)
                }
              />

              <Label>Marka ID</Label>
              <Input
                value={form.marketplaceSettings?.n11?.brandId}
                onChange={(e) =>
                  handleMarketplaceChange("n11", "brandId", e.target.value)
                }
              />

              <Label>Preparing Day</Label>
              <Input
                type="number"
                value={form.marketplaceSettings?.n11?.preparingDay}
                onChange={(e) =>
                  handleMarketplaceChange("n11", "preparingDay", e.target.value)
                }
              />

              <Label>Kargo Şablonu</Label>
              <Input
                value={form.marketplaceSettings?.n11?.shipmentTemplate}
                onChange={(e) =>
                  handleMarketplaceChange(
                    "n11",
                    "shipmentTemplate",
                    e.target.value
                  )
                }
              />

              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  checked={form.marketplaceSettings?.n11?.domestic}
                  onCheckedChange={(val) =>
                    handleMarketplaceChange("n11", "domestic", val)
                  }
                />
                <Label>Domestic</Label>
              </div>
            </div>

            {/* Trendyol */}
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
              <h2 className="font-semibold text-sm mb-2">Trendyol Ayarları</h2>

              <Label>Kategori ID</Label>
              <Input
                value={form.marketplaceSettings?.trendyol?.categoryId}
                onChange={(e) =>
                  handleMarketplaceChange("trendyol", "categoryId", e.target.value)
                }
              />

              <Label>Marka ID</Label>
              <Input
                value={form.marketplaceSettings?.trendyol?.brandId}
                onChange={(e) =>
                  handleMarketplaceChange("trendyol", "brandId", e.target.value)
                }
              />

              <Label>Kargo Firma ID</Label>
              <Input
                value={form.marketplaceSettings?.trendyol?.cargoCompanyId}
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
              <h2 className="font-semibold text-sm mb-2">Hepsiburada Ayarları</h2>

              <Label>Kategori ID</Label>
              <Input
                value={form.marketplaceSettings?.hepsiburada?.categoryId}
                onChange={(e) =>
                  handleMarketplaceChange("hepsiburada", "categoryId", e.target.value)
                }
              />

              <Label>Merchant SKU</Label>
              <Input
                value={form.marketplaceSettings?.hepsiburada?.merchantSku}
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
                value={form.marketplaceSettings?.hepsiburada?.desi}
                onChange={(e) =>
                  handleMarketplaceChange("hepsiburada", "desi", e.target.value)
                }
              />

              <Label>Kilogram</Label>
              <Input
                value={form.marketplaceSettings?.hepsiburada?.kg}
                onChange={(e) =>
                  handleMarketplaceChange("hepsiburada", "kg", e.target.value)
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* -------------------- GÖNDERİM DURUMU -------------------- */}
        <TabsContent value="sync">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-sm mb-2">Pazaryeri Gönderim Durumları</h2>

            <pre className="bg-gray-100 p-4 rounded-lg text-sm">
{JSON.stringify(form.marketplaces, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-4 gap-2">
        <Button variant="outline" onClick={() => router.push("/dashboard/urunler")}>
          Vazgeç
        </Button>

        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
