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

  // N11 çok seviyeli kategori seçim state'leri
  const [level1, setLevel1] = useState([]); // Ana kategoriler
  const [level2, setLevel2] = useState([]); // 2. seviye
  const [level3, setLevel3] = useState([]); // 3. seviye

  const [selectedL1, setSelectedL1] = useState("");
  const [selectedL2, setSelectedL2] = useState("");
  const [selectedL3, setSelectedL3] = useState("");

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
        router.push("/dashboard/urunler");
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

  // N11 ana kategorileri yükle
  const loadLevel1 = async () => {
    try {
      const res = await fetch("/api/n11/categories/list");
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setLevel1(data.categories);
      } else if (data.success && Array.isArray(data.data)) {
        setLevel1(data.data);
      }
    } catch (err) {
      console.error("N11 ana kategori yüklenemedi:", err);
    }
  };

  // Belirli bir parentId için alt kategorileri yükle
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

  // Sayfa açıldığında ana kategorileri çek
  useEffect(() => {
    loadLevel1();
  }, []);

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
                onChange={(e) =>
                  handleChange("description", e.target.value)
                }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm">
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
          </div>
        </TabsContent>

        {/* -------------------- PAZARYERİ AYARLARI -------------------- */}
        <TabsContent value="marketplaces">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* N11 */}
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
              <h2 className="font-semibold text-sm mb-2">N11 Ayarları</h2>

              {/* N11 Çok Seviyeli Kategori Seçimi */}
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

                      if (val) {
                        await loadSubCategories(val, setLevel2);
                        handleMarketplaceChange("n11", "categoryId", val);
                      } else {
                        handleMarketplaceChange("n11", "categoryId", "");
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

                        if (val) {
                          await loadSubCategories(val, setLevel3);
                          handleMarketplaceChange("n11", "categoryId", val);
                        } else if (selectedL1) {
                          handleMarketplaceChange(
                            "n11",
                            "categoryId",
                            selectedL1
                          );
                        } else {
                          handleMarketplaceChange("n11", "categoryId", "");
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedL3(val);
                        if (val) {
                          handleMarketplaceChange("n11", "categoryId", val);
                        } else if (selectedL2) {
                          handleMarketplaceChange(
                            "n11",
                            "categoryId",
                            selectedL2
                          );
                        } else if (selectedL1) {
                          handleMarketplaceChange(
                            "n11",
                            "categoryId",
                            selectedL1
                          );
                        } else {
                          handleMarketplaceChange("n11", "categoryId", "");
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
                  Seçilen kategori ID:{" "}
                  {form.marketplaceSettings?.n11?.categoryId || "-"}
                </p>
              </div>

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
                  handleMarketplaceChange(
                    "n11",
                    "preparingDay",
                    e.target.value
                  )
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
            </div>

            {/* Trendyol */}
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
              <h2 className="font-semibold text-sm mb-2">
                Trendyol Ayarları
              </h2>

              <Label>Kategori ID</Label>
              <Input
                value={form.marketplaceSettings?.trendyol?.categoryId}
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
                value={form.marketplaceSettings?.trendyol?.brandId}
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
              <h2 className="font-semibold text-sm mb-2">
                Hepsiburada Ayarları
              </h2>

              <Label>Kategori ID</Label>
              <Input
                value={form.marketplaceSettings?.hepsiburada?.categoryId}
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

              <Label>Ağırlık (kg)</Label>
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
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h2 className="font-semibold text-sm mb-2">Gönderim Durumu</h2>

            {/* Buraya N11 / Trendyol task status vs. eklenebilir */}

            <Button
              variant="secondary"
              onClick={async () => {
                const res = await fetch("/api/n11/products/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sellerCode: form.sku,
                    price: form.priceTl,
                    stock: form.stock,
                  }),
                });

                const data = await res.json();
                alert(data.message);
              }}
            >
              N11'e Güncelle
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6 gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/urunler")}>
          Vazgeç
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
