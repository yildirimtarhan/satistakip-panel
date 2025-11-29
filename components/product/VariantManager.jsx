// 📁 /components/product/VariantManager.jsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X } from "lucide-react";

export default function VariantManager({ variants, setVariants, trendyolColors = [], trendyolSizes = [] }) {
  // Form state: yeni varyant oluşturmak için
  const [variantForm, setVariantForm] = useState({
    color: "",
    size: "",
    colorCustom: "",
    sizeCustom: "",
    barcode: "",
    sku: "",
    stock: 0,
    priceTl: 0,
    images: [""]
  });

  // Form alanlarını güncelle
  const updateForm = (field, value) => {
    setVariantForm((prev) => ({ ...prev, [field]: value }));
  };

  // Yeni varyant ekle
  const addVariant = () => {
    const colorValue = variantForm.color === "custom" ? variantForm.colorCustom : variantForm.color;
    const sizeValue = variantForm.size === "custom" ? variantForm.sizeCustom : variantForm.size;

    if (!colorValue || !sizeValue) {
      alert("Renk ve beden alanları zorunludur.");
      return;
    }

    const newVariant = {
      color: colorValue,
      size: sizeValue,
      barcode: variantForm.barcode,
      sku: variantForm.sku,
      stock: Number(variantForm.stock),
      priceTl: Number(variantForm.priceTl),
      images: variantForm.images
    };

    setVariants([...variants, newVariant]);

    // Formu temizle
    setVariantForm({
      color: "",
      size: "",
      colorCustom: "",
      sizeCustom: "",
      barcode: "",
      sku: "",
      stock: 0,
      priceTl: 0,
      images: [""]
    });
  };

  // Varyant sil
  const deleteVariant = (index) => {
    const updated = [...variants];
    updated.splice(index, 1);
    setVariants(updated);
  };

  return (
    <div className="space-y-6">

      {/* ----------------- Varyant Ekleme Formu ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl shadow-sm border">
        
        {/* Renk */}
        <div>
          <Label>Renk</Label>
          <Select
            value={variantForm.color}
            onValueChange={(v) => updateForm("color", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Renk seçin" />
            </SelectTrigger>
            <SelectContent>
              {trendyolColors.map((c, idx) => (
                <SelectItem key={idx} value={c}>
                  {c}
                </SelectItem>
              ))}
              <SelectItem value="custom">+ Özel Renk Ekle</SelectItem>
            </SelectContent>
          </Select>

          {variantForm.color === "custom" && (
            <Input
              className="mt-2"
              placeholder="Özel renk girin"
              value={variantForm.colorCustom}
              onChange={(e) => updateForm("colorCustom", e.target.value)}
            />
          )}
        </div>

        {/* Beden */}
        <div>
          <Label>Beden</Label>
          <Select
            value={variantForm.size}
            onValueChange={(v) => updateForm("size", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Beden seçin" />
            </SelectTrigger>
            <SelectContent>
              {trendyolSizes.map((s, idx) => (
                <SelectItem key={idx} value={s}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value="custom">+ Özel Beden Ekle</SelectItem>
            </SelectContent>
          </Select>

          {variantForm.size === "custom" && (
            <Input
              className="mt-2"
              placeholder="Özel beden girin"
              value={variantForm.sizeCustom}
              onChange={(e) => updateForm("sizeCustom", e.target.value)}
            />
          )}
        </div>

        {/* Barkod */}
        <div>
          <Label>Barkod</Label>
          <Input
            placeholder="13 haneli barkod"
            value={variantForm.barcode}
            onChange={(e) => updateForm("barcode", e.target.value)}
          />
        </div>

        {/* SKU */}
        <div>
          <Label>SKU</Label>
          <Input
            placeholder="Varyant SKU"
            value={variantForm.sku}
            onChange={(e) => updateForm("sku", e.target.value)}
          />
        </div>

        {/* Stok */}
        <div>
          <Label>Stok</Label>
          <Input
            type="number"
            placeholder="0"
            value={variantForm.stock}
            onChange={(e) => updateForm("stock", e.target.value)}
          />
        </div>

        {/* Fiyat */}
        <div>
          <Label>Fiyat (TL)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={variantForm.priceTl}
            onChange={(e) => updateForm("priceTl", e.target.value)}
          />
        </div>

        {/* Varyant Görseli (opsiyonel) */}
        <div className="md:col-span-3">
          <Label>Varyant Görseli (opsiyonel)</Label>
          <Input
            placeholder="https://resim.jpg"
            value={variantForm.images[0]}
            onChange={(e) =>
              setVariantForm((prev) => ({
                ...prev,
                images: [e.target.value]
              }))
            }
          />
        </div>

        {/* Ekle Butonu */}
        <div className="md:col-span-3 flex justify-end">
          <Button onClick={addVariant}>Varyant Ekle</Button>
        </div>
      </div>

      {/* ----------------- Varyant Listesi Tablosu ----------------- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        
        <h2 className="font-semibold mb-4">Varyant Listesi</h2>

        {variants.length === 0 ? (
          <p className="text-gray-500 text-sm">Henüz varyant eklenmemiş.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Renk</TableHead>
                <TableHead>Beden</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Sil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.color}</TableCell>
                  <TableCell>{v.size}</TableCell>
                  <TableCell>{v.sku}</TableCell>
                  <TableCell>{v.barcode}</TableCell>
                  <TableCell>{v.stock}</TableCell>
                  <TableCell>{v.priceTl} TL</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteVariant(i)}
                      className="flex items-center gap-1"
                    >
                      <X size={16} />
                      Sil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
