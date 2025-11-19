"use client";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Kullanıcıları çek
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
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

  // Kullanıcı onaylama
  const handleApprove = async (id, newStatus) => {
    try {
      await fetch("/api/admin/updateUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved: newStatus }),
      });

      fetchUsers();
    } catch (err) {
      console.error("Onay hatası:", err);
    }
  };

  // Kullanıcı rol değiştir
  const updateRole = async (id, newRole) => {
    try {
      await fetch("/api/admin/updateUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      });

      fetchUsers();
    } catch (err) {
      console.error("Rol değiştirme hatası:", err);
    }
  };

  // Kullanıcı silme
  const deleteUser = async (id) => {
    if (!confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) return;

    try {
      await fetch("/api/admin/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      fetchUsers();
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>👤 Kullanıcı Yönetimi</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={td}>Ad</th>
            <th style={td}>Soyad</th>
            <th style={td}>Email</th>
            <th style={td}>Telefon</th>
            <th style={td}>Rol</th>
            <th style={td}>Durum</th>
            <th style={td}>İşlemler</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user._id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={td}>{user.ad || "-"}</td>
              <td style={td}>{user.soyad || "-"}</td>
              <td style={td}>{user.email || "-"}</td>
              <td style={td}>{user.phone || "-"}</td>

              {/* Rol */}
              <td style={td}>
                <select
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

              {/* Durum */}
              <td style={td}>
                {user.approved ? "✔ Onaylı" : "⏳ Bekliyor"}
              </td>

              {/* İşlem butonları */}
              <td style={td}>
                {!user.approved && (
                  <button
                    onClick={() => handleApprove(user._id, true)}
                    style={{ marginRight: "5px" }}
                  >
                    Onayla
                  </button>
                )}

                {user.approved && (
                  <button
                    onClick={() => handleApprove(user._id, false)}
                    style={{ marginRight: "5px" }}
                  >
                    Geri Al
                  </button>
                )}

                <button
                  onClick={() => deleteUser(user._id)}
                  style={{ color: "red" }}
                >
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const td = { padding: "8px", border: "1px solid #ddd" };
