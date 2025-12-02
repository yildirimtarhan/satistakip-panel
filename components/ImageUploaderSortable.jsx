"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function ImageUploaderSortable({ images, setImages }) {
  const [uploading, setUploading] = useState(false);

  // 🔥 Cloudinary Upload
  const handleUpload = async (files) => {
    setUploading(true);

    const uploaded = [];

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
      if (data.secure_url) uploaded.push(data.secure_url);
    }

    setImages([...images, ...uploaded]);
    setUploading(false);
  };

  const handleSelect = (e) => {
    const files = Array.from(e.target.files);
    handleUpload(files);
  };

  const handleDropUpload = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const removeImage = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
  };

  // 🔥 Drag & Drop Handle
  const handleDragEnd = (e) => {
    const { active, over } = e;

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img === active.id);
    const newIndex = images.findIndex((img) => img === over.id);

    const sorted = arrayMove(images, oldIndex, newIndex);
    setImages(sorted);
  };

  return (
    <div className="space-y-4">

      {/* DRAG & DROP ALANI */}
      <div
        className="border-2 border-dashed border-gray-400 p-6 text-center rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropUpload}
      >
        <p>📸 Sürükle & bırak veya tıklayarak fotoğraf ekle</p>

        <input
          id="fileSelector"
          type="file"
          multiple
          className="hidden"
          onChange={handleSelect}
        />

        <button
          type="button"
          onClick={() => document.getElementById("fileSelector").click()}
          className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg"
        >
          Resim Seç
        </button>

        {uploading && <p className="text-blue-500 mt-2">Yükleniyor…</p>}
      </div>

      {/* RESİM GALERİ — SORTABLE */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={images} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {images.map((img, i) => (
              <SortableImage
                key={img}
                id={img}
                img={img}
                index={i}
                remove={removeImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// 🔥 Tekil resim kartı — sürüklenebilir
function SortableImage({ id, img, index, remove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <img
        src={img}
        className="w-full h-24 object-cover rounded-xl border"
        alt=""
        {...attributes}
        {...listeners}
      />

      <button
        type="button"
        onClick={() => remove(index)}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-2"
      >
        X
      </button>
    </div>
  );
}
