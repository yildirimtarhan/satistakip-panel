"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import RequireAuth from "@/components/RequireAuth";

export default function AlisDetayPage() {
  const router = useRouter();
  const { id, edit } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(edit === "1");
  const [editForm, setEditForm] = useState({ date: "", description: "" });

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    if (edit === "1") setEditing(true);
  }, [edit]);

  const load = async () => {
    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(`/api/purchases/${id}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.message || "Alış bulunamadı");
        return;
      }
      setData(json);
      setEditForm({
        date: json.date ? new Date(json.date).toISOString().slice(0, 10) : "",
        description: json.description || "",
      });
    } catch (err) {
      console.error("Alış detay hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = items.reduce((sum, i) => sum + Number(i.total || 0), 0);

  // ✅ PDF İNDİR (DOĞRU YERDE)
  const downloadPdf = () => {
    const token = localStorage.getItem("token") || "";
    if (!token) {
      alert("Oturum bulunamadı");
      return;
    }
    window.open(`/api/purchases/${id}/pdf?token=${token}`, "_blank");
  };

  // ✅ ALIŞ İPTAL
  const saveEdit = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: editForm.date || undefined, description: editForm.description }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(j.message || "Güncellendi");
        setEditing(false);
        load();
      } else {
        alert(j.message || "Güncelleme başarısız");
      }
    } catch (e) {
      alert("Güncelleme sırasında hata");
      console.error(e);
    }
  };

  const cancelPurchase = async () => {
    if (
      !confirm(
        "Bu alış iptal edilsin mi?\n(Stok geri alınacak ve cari ters kayıt işlenecek)"
      )
    )
      return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const j = await res.json().catch(() => ({}));

      if (res.ok) {
        alert(j.message || "Alış iptal edildi");
        router.push("/dashboard/alislar");
      } else {
        alert(j.message || "İptal edilemedi");
      }
    } catch (e) {
      alert("İptal sırasında hata oluştu");
      console.error(e);
    }
  };

  if (loading) return <div className="p-6">Yükleniyor…</div>;
  if (!data) return <div className="p-6">Alış bulunamadı</div>;

  return (
    <RequireAuth>
      <div className="p-6">
        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-semibold">Alış Detayı</h1>

          <div className="flex gap-2 flex-wrap">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                Düzenle
              </button>
            ) : (
              <>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Açıklama"
                  className="border rounded px-2 py-1 flex-1 min-w-[180px]"
                />
                <button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded">
                  Kaydet
                </button>
                <button onClick={() => setEditing(false)} className="border px-4 py-2 rounded">
                  İptal
                </button>
              </>
            )}
            <button
              onClick={downloadPdf}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              PDF İndir
            </button>
            {!data?.cancelled && (
              <button
                onClick={cancelPurchase}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Alış İptal Et
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 text-sm">
          <div>
            <b>Cari:</b>{" "}
            {data.accountId?.unvan ||
              data.accountId?.ad ||
              data.accountId?.email ||
              "-"}
          </div>
          <div>
            <b>Tarih:</b>{" "}
            {data.date
              ? new Date(data.date).toLocaleDateString("tr-TR")
              : "-"}
          </div>
        </div>

        <table className="w-full border text-sm mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Ürün</th>
              <th className="border px-2 py-1">Barkod</th>
              <th className="border px-2 py-1 text-right">Adet</th>
              <th className="border px-2 py-1 text-right">Birim ₺</th>
              <th className="border px-2 py-1 text-right">Toplam ₺</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border px-2 py-4 text-center text-gray-500"
                >
                  Alış kalemi yok
                </td>
              </tr>
            ) : (
              items.map((i, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">
                    {i.productId?.name || "-"}
                  </td>
                  <td className="border px-2 py-1">
                    {i.productId?.barcode || "-"}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {i.quantity}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {Number(i.unitPrice || 0).toLocaleString("tr-TR")}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {Number(i.total || 0).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="text-right font-semibold">
          Genel Toplam:{" "}
          {total.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
          })}{" "}
          ₺
        </div>

        <button
          onClick={() => router.push("/dashboard/alislar")}
          className="mt-4 px-4 py-2 border rounded"
        >
          ← Listeye Dön
        </button>
      </div>
    </RequireAuth>
  );
}
