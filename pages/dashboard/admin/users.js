"use client";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");

  // 🔄 Kullanıcıları çek
  const fetchUsers = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kullanıcılar alınamadı");
        return;
      }

      setUsers(data.users);
    } catch (err) {
      console.error("Kullanıcı çekme hatası:", err);
      setError("Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id, newStatus) => {
    try {
      const token = getToken();
      const res = await fetch("/api/admin/updateUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, approved: newStatus }),
      });

      if (!res.ok) alert("İşlem başarısız");
      fetchUsers();
    } catch (err) {
      console.error("Onay hatası:", err);
    }
  };

  const updateRole = async (id, newRole) => {
    try {
      const token = getToken();
      const res = await fetch("/api/admin/updateUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, role: newRole }),
      });

      if (!res.ok) alert("Rol güncellenemedi");
      fetchUsers();
    } catch (err) {
      console.error("Rol değiştirme hatası:", err);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) return;

    try {
      const token = getToken();
      const res = await fetch("/api/admin/deleteUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) alert("Silme başarısız");
      fetchUsers();
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  const handleResetTestData = async () => {
    if (!confirm("Alış, satış ve cari hareketlerini tamamen silip carileri sıfırlayacaksınız. Emin misiniz?")) return;
    setResetLoading(true);
    try {
      const r = await fetch("/api/admin/reset-test-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "İşlem başarısız");
      alert("✅ " + (data.message || "Sıfırlama tamamlandı."));
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👥 Kullanıcı Yönetimi</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleResetTestData}
          disabled={resetLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {resetLoading ? "⏳ Sıfırlanıyor..." : "🗑️ Test Verilerini Sıfırla"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-3">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full border rounded-lg shadow-sm">
          <thead className="bg-slate-200">
            <tr>
              <th className="p-2 border">Ad</th>
              <th className="p-2 border">Soyad</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Telefon</th>
              <th className="p-2 border">Rol</th>
              <th className="p-2 border">Durum</th>
              <th className="p-2 border">İşlemler</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="text-center border-b">
                <td className="p-2 border">{user.ad || "-"}</td>
                <td className="p-2 border">{user.soyad || "-"}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.phone}</td>

                <td className="p-2 border">
                  <select
                    className="border rounded p-1"
                    value={user.role}
                    onChange={(e) => updateRole(user._id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="bayi">Bayi</option>
                    <option value="personel">Personel</option>
                    <option value="operator">Operator</option>
                  </select>
                </td>

                <td className="p-2 border">
                  {user.approved ? (
                    <span className="text-green-600 font-semibold">✔ Onaylı</span>
                  ) : (
                    <span className="text-yellow-600 font-semibold">⏳ Bekliyor</span>
                  )}
                </td>

                <td className="p-2 border">
                  {!user.approved ? (
                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded mr-2"
                      onClick={() => handleApprove(user._id, true)}
                    >
                      Onayla
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded mr-2"
                      onClick={() => handleApprove(user._id, false)}
                    >
                      Geri Al
                    </button>
                  )}

                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded"
                    onClick={() => deleteUser(user._id)}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
