// pages/dashboard/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwtDecode from "jwt-decode";

export default function AdminPanel() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setUser(decoded);

      if (decoded.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push("/dashboard"); // admin değilse dashboard'a at
        return;
      }

      fetch("/api/admin/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users || []));
    } catch (err) {
      console.error("Token hatalı:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>👑 Admin Paneli</h1>
      {user && <p>Hoş geldin <b>{user.email}</b></p>}

      <h2 style={{ marginTop: "2rem" }}>Kayıtlı Kullanıcılar</h2>
      <table border="1" cellPadding="8" style={{ marginTop: "1rem", width: "100%" }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Kayıt Tarihi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.email}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
