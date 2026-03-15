"use client";

import Link from "next/link";

export default function IdefixEfaturaPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix e-Fatura İşleme</h1>
      <p className="text-sm text-gray-500 mb-6">
        İdefix siparişlerine (sevkiyatlara) e-Arşiv veya e-Fatura linki göndermek için kullanılır.
      </p>
      <div className="bg-white border rounded-lg p-6 shadow-sm space-y-3">
        <p className="text-gray-700 text-sm">
          Fatura linki, <strong>Siparişler</strong> sayfasından ilgili sevkiyata tıklayıp detayda veya toplu işlem ile <strong>invoice-link</strong> API’si üzerinden iletilir.
        </p>
        <Link href="/dashboard/idefix/orders" className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">
          Siparişlere git
        </Link>
        <p className="text-gray-500 text-xs mt-2">
          E-Fatura / e-Arşiv oluşturma için <Link href="/dashboard/efatura" className="text-amber-600 hover:underline">E-Fatura Paneli</Link> kullanılır; oluşan fatura linki İdefix’e bu akışla gönderilir.
        </p>
      </div>
      <div className="mt-4">
        <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm">API Ayarları</Link>
      </div>
    </div>
  );
}
