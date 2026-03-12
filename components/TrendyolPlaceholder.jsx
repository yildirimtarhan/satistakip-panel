"use client";

import Link from "next/link";

export default function TrendyolPlaceholder({ title, icon = "📋", description }) {
  return (
    <div className="p-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <span className="text-5xl mb-4 block">{icon}</span>
        <h1 className="text-2xl font-bold text-orange-600 mb-2">{title}</h1>
        <p className="text-slate-600 mb-4">
          {description || "Bu entegrasyon modülü geliştirme aşamasındadır."}
        </p>
        <p className="text-sm text-slate-500 mb-6">
          Trendyol Hesap Bilgilerim &gt; Entegrasyon Bilgileri bölümünde bu role sahip API anahtarınızı kullanarak bu modül aktif edilecektir.
        </p>
        <Link
          href="/dashboard/api-settings?tab=trendyol"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          API Ayarlarına Git
        </Link>
      </div>
    </div>
  );
}
