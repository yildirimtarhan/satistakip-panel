"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

export default function CloudinaryUploader({ images, setImages }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url) {
        setImages((prev) => [...prev, data.secure_url]);
      }
    }

    setUploading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeImage = (url) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  return (
    <div>
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
          <p>Görselleri buraya sürükleyin veya tıklayın</p>
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
