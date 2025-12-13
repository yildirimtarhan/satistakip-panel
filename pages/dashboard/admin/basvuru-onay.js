"use client";

import { useEffect, useState } from "react";

export default function AdminBasvuruOnay() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/edonusum/admin/applications", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setList(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/edonusum/admin/applications", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id,
        status,
        adminNote: status === "rejected" ? "Admin tarafından reddedildi" : "",
      }),
    });

    if (res.ok) {
      fetchList();
    } else {
      alert("İşlem başarısız");
    }
  };

  if (loading) return <p className="p-6">Yükleniyor...</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-orange-600 mb-4">
        🛡️ Başvuru Onay Paneli
      </h1>

      {list.map((item) => (
        <div
          key={item._id}
          className="bg-white border rounded-xl p-4 mb-3 flex justify-between"
        >
          <div>
            <p><b>{item.contactName}</b> — {item.contactEmail}</p>
            <p className="text-sm text-slate-600">
              Modüller:{" "}
              {Object.entries(item.modules)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(", ")}
            </p>
            <p className="text-sm">Durum: <b>{item.status}</b></p>
          </div>

          <div className="flex gap-2">
            <button
              className="bg-green-600 text-white px-3 py-1 rounded"
              onClick={() => updateStatus(item._id, "approved")}
            >
              ✔ Onayla
            </button>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded"
              onClick={() => updateStatus(item._id, "rejected")}
            >
              ✖ Reddet
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
