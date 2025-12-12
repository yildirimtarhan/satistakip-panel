"use client";

import { useEffect, useState } from "react";

export default function AdminBasvuruOnay() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/edonusum/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Sunucu hatası");
        return;
      }

      setList(data.items || []);
    } catch (err) {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // -------------------------------
  // 🆕 ONAY / REDDET İŞLEMLERİ
  // -------------------------------
  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/edonusum/application-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, status }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || "İşlem yapılamadı");
      return;
    }

    alert("Başarıyla güncellendi!");
    fetchList();
  };

  // -------------------------------

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-orange-600">
        🛡️ E-Belge Başvuru Onay Paneli
      </h1>

      {loading && <p className="text-gray-500 mt-4">Yükleniyor...</p>}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      {!loading && list.length === 0 && (
        <p className="text-gray-500 mt-4">Bekleyen başvuru bulunmuyor.</p>
      )}

      {/* Liste */}
      <div className="mt-5 space-y-3">
        {list.map((item) => (
          <div
            key={item._id}
            className="border p-4 rounded-xl bg-white shadow flex justify-between items-center"
          >
            <div>
              <p>
                <b>Kullanıcı:</b> {item.contactName} ({item.contactEmail})
              </p>
              <p>
                <b>Modüller:</b>{" "}
                {Object.entries(item.modules)
                  .filter(([k, v]) => v)
                  .map(([k]) => k.toUpperCase())
                  .join(", ")}
              </p>
              <p>
                <b>Not:</b> {item.note || "-"}
              </p>
            </div>

            {/* ONAY – REDDET */}
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={() => updateStatus(item._id, "approved")}
              >
                ✔ Onayla
              </button>

              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => updateStatus(item._id, "rejected")}
              >
                ✖ Reddet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
