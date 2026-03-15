"use client";

import Link from "next/link";

export default function IdefixAccountingPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix Muhasebe</h1>
      <p className="text-sm text-gray-500 mb-6">
        İdefix satış ve ödeme bilgileri, hak ediş ve mutabakat ile ilgili ekranlar burada yer alacaktır.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-gray-700 text-sm">
        <p className="mb-2">Bu bölüm henüz geliştirme aşamasındadır. İdefix geliştirici dokümantasyonundaki muhasebe / finans endpoint’leri entegre edildiğinde bu sayfa güncellenecektir.</p>
        <Link href="/dashboard/idefix/orders" className="text-amber-600 hover:underline">Siparişler</Link> sayfasından sevkiyat ve fatura linki işlemlerinize erişebilirsiniz.
      </div>
      <div className="mt-4">
        <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm">API Ayarları</Link>
      </div>
    </div>
  );
}
