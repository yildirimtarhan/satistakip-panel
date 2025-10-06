import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Token geçerli mi kontrol et
    try {
      jwtDecode(token);
    } catch (err) {
      console.error("Token geçersiz:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/hepsiburada/orders/${id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || data.message || "Sipariş detayı alınamadı");
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error("Detay isteği hatası:", err);
        setError("Sunucuya ulaşılamıyor");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-500 font-bold">⚠ {error}</div>;
  if (!order) return <div className="p-4">Sipariş bulunamadı.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📦 Sipariş Detayı</h1>
      <div className="border p-4 rounded">
        <p><strong>Sipariş ID:</strong> {order.id || "—"}</p>
        <p><strong>Müşteri:</strong> {order.buyerName || order.customerName || "—"}</p>
        <p><strong>Durum:</strong> {order.status || "—"}</p>
        <p><strong>Tarih:</strong> {order.orderDate || "—"}</p>
        {/* İstersen Hepsiburada API'den gelen diğer alanları da buraya ekleyebilirsin */}
      </div>
    </div>
  );
}
// sayfanın en altına ekle
export async function getServerSideProps({ req }) {
  const token = req.cookies.token;
  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  return { props: {} };
}
