import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    if (!id) return;

    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(`/api/hepsiburada-api/orders/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Sipariş detayı alınamadı");
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error("İstek hatası:", err);
        setError("Sunucuya ulaşılamıyor.");
      }
    };

    fetchOrderDetail();
  }, [router, id]); // ✅ router + id dependency eklendi

  if (error) {
    return <div className="text-red-500 font-bold">⚠ {error}</div>;
  }

  if (!order) {
    return <p>Yükleniyor...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Sipariş Detayı</h1>
      <p>Müşteri: {order.customerFirstName} {order.customerLastName}</p>
      <p>Durum: {order.status}</p>
      <p>Sipariş ID: {order.id}</p>
      {/* Buraya diğer sipariş alanlarını ekleyebilirsin */}
    </div>
  );
}
