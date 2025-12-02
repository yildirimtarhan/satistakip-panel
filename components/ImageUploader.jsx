"use client";
import { useState } from "react";

export default function ImageUploader({ images, setImages }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files) => {
    setUploading(true);

    const uploadedImages = [];

    for (let file of files) {
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
        uploadedImages.push(data.secure_url);
      }
    }

    setImages([...images, ...uploadedImages]);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleUpload(files);
  };

  const removeImage = (index) => {
    const copy = [...images];
    copy.splice(index, 1);
    setImages(copy);
  };

  return (
    <div className="space-y-4">
      {/* DRAG & DROP ALANI */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-400 rounded-xl p-6 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <p className="text-gray-600">Sürükle & Bırak veya Tıklayıp Seç</p>

        <input
          type="file"
          multiple
          className="hidden"
          id="imageUploadInput"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          onClick={() => document.getElementById("imageUploadInput").click()}
          className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg"
        >
          Fotoğraf Yükle
        </button>
      </div>

      {uploading && <p className="text-blue-500">Yükleniyor...</p>}

      {/* GÖRSELLER */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((img, index) => (
          <div key={index} className="relative">
            <img
              src={img}
              alt="product"
              className="w-full h-24 object-cover rounded-lg"
            />

            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-2"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
