import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode"; // ✅ Doğru import
import Cookies from "js-cookie";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/auth/login"); // Token yoksa login'e yönlendir
      return;
    }

    try {
      const decoded = jwtDecode(token); // ✅ Hatalı değil artık
      setUser(decoded);
    } catch (error) {
      console.error("Token çözümlenemedi:", error);
      router.push("/auth/login");
    }
  }, [router]); // ✅ useEffect bağımlılığı düzeltildi

  if (!user) return <div>Yükleniyor...</div>;

  return (
    <div>
      <h1>Merhaba, {user.name || user.email} 👋</h1>
      <p>Dashboard sayfasına hoş geldiniz.</p>
    </div>
  );
}
