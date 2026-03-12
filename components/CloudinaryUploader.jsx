"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export default function CloudinaryUploader({ images, setImages }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setError("");
    if (acceptedFiles.length === 0 && rejectedFiles?.length > 0) {
      const reason = rejectedFiles[0]?.errors?.[0]?.message || "";
      setError(reason.includes("size") ? "Dosya 10MB'dan büyük olamaz." : "Dosya kabul edilmedi. JPG, PNG, GIF, WebP deneyin.");
      return;
    }
    if (acceptedFiles.length === 0) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError("Cloudinary ayarları eksik. .env dosyasında NEXT_PUBLIC_CLOUDINARY_* değişkenlerini kontrol edin.");
      return;
    }

    setUploading(true);
    const uploaded = [];
    let lastError = "";

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();

        if (data.secure_url) {
          uploaded.push(data.secure_url);
          lastError = "";
        } else {
          lastError = data.error?.message || data.message || "Yükleme başarısız";
          console.error("Cloudinary hata:", data);
        }
      } catch (e) {
        lastError = e.message || "Bağlantı hatası";
        console.error("Upload hatası:", e);
      }
    }

    if (uploaded.length > 0) {
      setImages((prev) => [...prev, ...uploaded]);
      setError("");
    }
    if (lastError) setError(lastError);
    setUploading(false);
  }, [setImages]);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url || !url.startsWith("http")) return;
    setImages((prev) => [...prev, url]);
    setUrlInput("");
    setError("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    // accept belirtilmedi — Windows'ta indirilen görseller bazen application/octet-stream
    // olarak gelebilir; strict accept bunları reddeder
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
  });

  const removeImage = (url) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  return (
    <div className="space-y-4">
      {/* Hata mesajı */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* URL ile ekle (indirilen/pazaryeri görselleri için) */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://... (Görsel URL'si)"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={addUrl}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
        >
          URL Ekle
        </button>
      </div>

      {/* Upload Alanı */}
      <div
        {...getRootProps()}
        className="p-6 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-gray-50 transition"
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-orange-600 font-medium">Yükleniyor...</p>
        ) : isDragActive ? (
          <p className="text-orange-600">Bırakabilirsiniz...</p>
        ) : (
          <p>Görselleri buraya sürükleyin veya tıklayın (İndirdiğiniz dosyalar da desteklenir)</p>
        )}
      </div>

      {/* Önizleme Alanı */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img
              src={url}
              className="w-full h-28 object-cover rounded-lg border"
            />
            <button
              onClick={() => removeImage(url)}
              className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
