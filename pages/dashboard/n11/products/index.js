import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

/* ===============================
   STATUS BADGE
================================ */
function N11StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400">—</span>;

  const map = {
    WAITING: "bg-gray-200 text-gray-800",
    PROCESSING: "bg-blue-200 text-blue-800",
    COMPLETED: "bg-green-200 text-green-800",
    FAILED: "bg-red-200 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        map[status] || "bg-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

/* ===============================
   ERROR MODAL
================================ */
function ErrorModal({ open, onClose, errors = [] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-3">
          N11 Gönderim Hataları
        </h2>

        <ul className="list-disc pl-5 text-sm text-gray-700 max-h-64 overflow-auto">
          {errors.map((e, i) => (
            <li key={i}>{e.message || e}</li>
          ))}
        </ul>

        <div className="text-right mt-4">
          <Button onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   PAGE
================================ */
export default function N11ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalErrors, setModalErrors] = useState([]);

  /* ===============================
     FETCH PRODUCTS
  ================================ */
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch("/api/n11/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ===============================
     BULK PRICE/STOCK
  ================================ */
  const bulkUpdateN11PriceStock = async () => {
    const token = localStorage.getItem("token");

    const items = products
      .filter((p) => p.sellerCode)
      .map((p) => ({
        sellerCode: p.sellerCode,
        price: p.price,
        stock: p.stock || 0,
      }));

    if (items.length === 0) {
      alert("Güncellenecek ürün bulunamadı");
      return;
    }

    try {
      setUpdating(true);
      await fetch("/api/n11/products/update-stock-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    
  };
  }

  /* ===============================
     ERP IMPORT
  ================================ */
  const importProduct = async (p) => {
    alert(`ERP'ye aktarılacak ürün: ${p.title}`);
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">N11 Ürünleri</h1>

      <div className="flex justify-between mb-4">
        <Button onClick={fetchProducts} disabled={loading}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </Button>

        <Button onClick={bulkUpdateN11PriceStock} disabled={updating || loading}>
          {updating ? "Güncelleniyor..." : "N11 Fiyat/Stok Güncelle"}
        </Button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Başlık</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Fiyat</th>
              <th className="p-2">ERP</th>
              <th className="p-2">N11 Durum</th>
              <th className="p-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.sellerCode || "-"}</td>
                <td className="p-2">{p.price} TL</td>
                <td className="p-2">
                  {p.erpMatched ? "✅ ERP’de Var" : "➕ Aktarılabilir"}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <N11StatusBadge status={p.n11TaskStatus} />

                    {p.n11TaskStatus === "FAILED" &&
                      p.n11Errors?.length > 0 && (
                        <button
                          className="text-red-600 underline text-xs"
                          onClick={() => {
                            setModalErrors(p.n11Errors);
                            setModalOpen(true);
                          }}
                        >
                          Detay
                        </button>
                      )}
                  </div>
                </td>
                <td className="p-2">
                  {!p.erpMatched && (
                    <Button size="sm" onClick={() => importProduct(p)}>
                      ERP'ye Aktar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ErrorModal
        open={modalOpen}
        errors={modalErrors}
        onClose={() => setModalOpen(false)}
      />
    </div>
  
  );
}