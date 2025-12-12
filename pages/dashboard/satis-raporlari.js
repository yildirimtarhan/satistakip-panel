"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function SatisRaporlari() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const token =
        Cookies.get("token") || localStorage.getItem("token") || "";

      const res = await fetch("/api/cari/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const filtered = data.filter((t) => t.type === "sale");
      setSales(filtered);
    } catch (err) {
      console.error("Satış verileri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // 1) Aylık Satış Grafiği
  // --------------------------

  const monthlyTotals = {};
  sales.forEach((sale) => {
    const month = sale.date?.slice(0, 7) || "??";
    monthlyTotals[month] = (monthlyTotals[month] || 0) + sale.totalTRY;
  });

  const monthlyChart = {
    labels: Object.keys(monthlyTotals),
    datasets: [
      {
        label: "Aylık Satış Toplamı (TRY)",
        data: Object.values(monthlyTotals),
        backgroundColor: "rgba(255,140,0,0.7)",
      },
    ],
  };

  // --------------------------
  // 2) En Çok Satış Yapılan Müşteriler
  // --------------------------

  const customerTotals = {};
  sales.forEach((sale) => {
    const c = sale.customerName || "Bilinmiyor";
    customerTotals[c] = (customerTotals[c] || 0) + sale.totalTRY;
  });

  const topCustomers = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const customerChart = {
    labels: topCustomers.map((v) => v[0]),
    datasets: [
      {
        label: "Müşteriler",
        data: topCustomers.map((v) => v[1]),
        backgroundColor: ["#ff6b6b", "#ffa502", "#2ed573", "#1e90ff", "#3742fa"],
      },
    ],
  };

  // --------------------------
  // 3) En Çok Satan Ürünler
  // --------------------------

  const productTotals = {};

  sales.forEach((sale) => {
    sale.lines?.forEach((l) => {
      productTotals[l.productName] =
        (productTotals[l.productName] || 0) + l.qty;
    });
  });

  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const productChart = {
    labels: topProducts.map((v) => v[0]),
    datasets: [
      {
        label: "Adet",
        data: topProducts.map((v) => v[1]),
        backgroundColor: "rgba(0,123,255,0.7)",
      },
    ],
  };

  // --------------------------
  // 4) Para Birimi Dağılımı
  // --------------------------

  const currencyTotals = {};

  sales.forEach((sale) => {
    const cur = sale.currency || "TRY";
    currencyTotals[cur] = (currencyTotals[cur] || 0) + sale.totalTRY;
  });

  const currencyChart = {
    labels: Object.keys(currencyTotals),
    datasets: [
      {
        label: "Para Birimi",
        data: Object.values(currencyTotals),
        backgroundColor: ["#ff4757", "#1e90ff", "#2ed573", "#ffa502"],
      },
    ],
  };

  return (
    <RequireAuth>
      <div className="p-6 space-y-10">
        <h1 className="text-2xl font-bold text-orange-600">
          📊 Satış Raporları
        </h1>

        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <>
            {/* Aylık Satış Grafiği */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Aylık Satış Toplamı
              </h2>
              <Bar data={monthlyChart} height={120} />
            </div>

            {/* Müşteri Grafiği */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                En Çok Satış Yapılan Müşteriler
              </h2>
              <Pie data={customerChart} height={120} />
            </div>

            {/* Ürün Grafiği */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                En Çok Satan Ürünler
              </h2>
              <Bar data={productChart} height={140} />
            </div>

            {/* Para Birimi Grafiği */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Para Birimine Göre Satış Dağılımı
              </h2>
              <Doughnut data={currencyChart} height={120} />
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
