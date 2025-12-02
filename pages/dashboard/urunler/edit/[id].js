"use client";

import { useEffect, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    brand: "",
    modelCode: "",
    category: "",
    description: "",
    images: [],

    stock: 0,
    priceTl: "",
    discountPriceTl: "",
    vatRate: 20,

    usdPrice: "",
    eurPrice: "",
    profitMargin: 20,
    riskFactor: 1.05,
    fxSource: "tcmb",

    marketplaceSettings: {
      n11: {},
      trendyol: {},
      hepsiburada: {},
    },
  });

  // -------------------------------------------------------
  // ✔ Ürünü API'den ÇEK
  // -------------------------------------------------------
  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/products/get?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Ürün bulunamadı");
        return;
      }

      setForm(data.product);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Ürün yüklenirken hata oluştu");
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------
  // ✔ ÜRÜN GÜNCELLE
  // -------------------------------------------------------
  const handleUpdate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/products/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, ...form }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("❌ Güncellenemedi: " + data.message);
        setIsSubmitting(false);
        return;
      }

      alert("✔ Ürün güncellendi!");
      router.push("/dashboard/urunler");
    } catch (err) {
      console.error(err);
      alert("Beklenmeyen hata oluştu");
    }

    setIsSubmitting(false);
  };

  if (loading) return <div className="p-6">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Ürünü Düzenle</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="stockPrice">Stok & Fiyat</TabsTrigger>
          <TabsTrigger value="marketplaces">Pazaryeri Ayarları</TabsTrigger>
          <TabsTrigger value="sync">Pazaryerine Gönder</TabsTrigger>
        </TabsList>

        {/* ------------ GENEL ------------ */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
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

            <div className="md:col-span-2">
              <Label>Açıklama</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Ürün Fotoğrafları</Label>
              <CloudinaryUploader
                images={form.images}
                setImages={(imgs) =>
                  setForm((prev) => ({ ...prev, images: imgs }))
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* ------------ STOK & FİYAT ------------ */}
        <TabsContent value="stockPrice">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
            <div>
              <Label>Stok</Label>
              <Input
                value={form.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
              />
            </div>

            <div>
              <Label>Satış Fiyatı (TL)</Label>
              <Input
                value={form.priceTl}
                onChange={(e) => handleChange("priceTl", e.target.value)}
              />
            </div>

            <div>
              <Label>İndirimli Fiyat</Label>
              <Input
                value={form.discountPriceTl}
                onChange={(e) =>
                  handleChange("discountPriceTl", e.target.value)
                }
              />
            </div>

            <div>
              <Label>KDV</Label>
              <Input
                value={form.vatRate}
                onChange={(e) => handleChange("vatRate", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        {/* ------------ PAZARYERİ ------------ */}
        <TabsContent value="marketplaces">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-slate-600 mb-2">
              N11, Trendyol ve HB ayarları daha sonra detaylı eklenecek.
            </p>
          </div>
        </TabsContent>

        {/* ------------ SENKRON ------------ */}
        <TabsContent value="sync">
          <div className="bg-white p-4 rounded-xl shadow">
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
              🔄 N11’e Güncelle
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ✔ En alttaki KAYDET butonu */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={handleUpdate}
          disabled={isSubmitting}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isSubmitting ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </div>
    </div>
  );
}
