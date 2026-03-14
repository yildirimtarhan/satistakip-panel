"use client";

import Link from "next/link";

export default function PazaramaProductsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pazarama Ürünler</h1>
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <p className="text-gray-600 mb-4">
          Pazarama ürünlerinizi buradan yönetebilirsiniz. Ürün eklemek için:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
          <li>Ürünler sayfasından yeni ürün ekleyin veya mevcut ürünü düzenleyin.</li>
          <li>Pazaryeri Ayarları kısmında Pazarama seçin ve kategori / marka ID&apos;lerini girin.</li>
          <li>
            <Link href="/dashboard/pazaryeri-gonder" className="text-orange-600 hover:underline font-medium">
              Pazaryerine Gönder
            </Link>{" "}
            sayfasından Pazarama&apos;ya ürün gönderin.
          </li>
        </ol>
        <Link
          href="/dashboard/pazaryeri-gonder"
          className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Ürün Gönder →
        </Link>
      </div>
    </div>
  );
}
