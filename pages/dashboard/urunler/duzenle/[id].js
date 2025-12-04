"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState(null);
  const [brands, setBrands] = useState([]);
  const [imagesPreview, setImagesPreview] = useState([]);

  // 📌 Form state
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    priceTl: 0,
    vatRate: 20,
    images: [],

    marketplaceSettings: {
      n11: {
        categoryId: "",
        brandId: "",
        preparingDay: 3,
        shipmentTemplate: "",
        domestic: true,
      },
      trendyol: { categoryId: "", brandId: "", cargoCompanyId: "" },
      hepsiburada: { categoryId: "", merchantSku: "", desi: "", kg: "" },
    },
  });

  // --------------------------------------------------------
  // 🎯 1) ÜRÜNÜ GETİR
  // --------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/get?id=${id}`);
        const data = await res.json();

        if (!res.ok) {
          alert("Ürün getirilemedi");
          return;
        }

        setProduct(data.product);

        // 🎯 Formu doldur
        setForm({
          ...form,
          name: data.product.name,
          sku: data.product.sku,
          barcode: data.product.barcode,
          description: data.product.description,
          priceTl: data.product.priceTl,
          vatRate: data.product.vatRate,
          images: data.product.images || [],
          marketplaceSettings: {
            ...form.marketplaceSettings,
            n11: {
              ...form.marketplaceSettings.n11,
              ...data.product.marketplaceSettings?.n11,
            },
            trendyol: {
              ...form.marketplaceSettings.trendyol,
              ...data.product.marketplaceSettings?.trendyol,
            },
            hepsiburada: {
              ...form.marketplaceSettings.hepsiburada,
              ...data.product.marketplaceSettings?.hepsiburada,
            },
          },
        });

        // 🎯 Resim önizleme
        setImagesPreview(data.product.images || []);

        // Eğer n11 categoryId varsa → marka listesini çek
        if (data.product.marketplaceSettings?.n11?.categoryId) {
          fetchBrands(data.product.marketplaceSettings.n11.categoryId);
        }

      } catch (e) {
        console.error("Ürün yükleme hatası:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  // --------------------------------------------------------
  // 🎯 2) N11 MARKA LİSTESİ GETİR
  // --------------------------------------------------------
  async function fetchBrands(categoryId) {
    try {
      const res = await fetch(`/api/n11/brands?categoryId=${categoryId}`);
      const data = await res.json();

      if (data.success) {
        setBrands(data.brands);
      } else {
        console.warn("Marka listesi alınamadı:", data.message);
      }
    } catch (e) {
      console.error("Marka API hatası:", e);
    }
  }

  // --------------------------------------------------------
  // 🎯 3) FORM DEĞİŞİKLİĞİ
  // --------------------------------------------------------
  const updateField = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const updateN11Field = (key, value) => {
    setForm({
      ...form,
      marketplaceSettings: {
        ...form.marketplaceSettings,
        n11: { ...form.marketplaceSettings.n11, [key]: value },
      },
    });

    if (key === "categoryId") {
      fetchBrands(value);
    }
  };

  // --------------------------------------------------------
  // 🎯 4) ÜRÜNÜ KAYDET
  // --------------------------------------------------------
  async function saveProduct() {
    setSaving(true);

    try {
      const res = await fetch(`/api/products/update?id=${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Kaydetme hatası");
        setSaving(false);
        return;
      }

      alert("Ürün başarıyla güncellendi");
      router.push("/dashboard/urunler");

    } catch (e) {
      console.error("Save error:", e);
    }

    setSaving(false);
  }

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="page-container">
      <h2>Ürünü Düzenle</h2>

      {/* GENEL BİLGİLER */}
      <div className="card">
        <label>Ürün Adı</label>
        <input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
        />

        <label>SKU</label>
        <input
          value={form.sku}
          onChange={(e) => updateField("sku", e.target.value)}
        />

        <label>Barkod</label>
        <input
          value={form.barcode}
          onChange={(e) => updateField("barcode", e.target.value)}
        />

        <label>Açıklama</label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </div>

      {/* RESİMLER */}
      <div className="card">
        <h3>Ürün Resimleri</h3>

        <div className="image-list">
          {imagesPreview.map((img, i) => (
            <Image key={i} width={120} height={120} src={img} alt="img" />
          ))}
        </div>
      </div>

      {/* N11 AYARLARI */}
      <div className="card">
        <h3>N11 Ayarları</h3>

        <label>Kategori ID</label>
        <input
          value={form.marketplaceSettings.n11.categoryId}
          onChange={(e) => updateN11Field("categoryId", e.target.value)}
        />

        <label>Marka</label>
        <select
          value={form.marketplaceSettings.n11.brandId}
          onChange={(e) => updateN11Field("brandId", e.target.value)}
        >
          <option value="">Seçiniz</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label>Kargolama Günü</label>
        <input
          type="number"
          value={form.marketplaceSettings.n11.preparingDay}
          onChange={(e) => updateN11Field("preparingDay", e.target.value)}
        />
      </div>

      {/* KAYDET */}
      <button disabled={saving} onClick={saveProduct} className="save-btn">
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>

      <style jsx>{`
        .card {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        input,
        textarea,
        select {
          display: block;
          width: 100%;
          padding: 8px;
          margin: 8px 0 15px;
        }
        .save-btn {
          padding: 12px 25px;
          background: #0070f3;
          color: #fff;
          border: none;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
