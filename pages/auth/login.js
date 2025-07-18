import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Geçici giriş kontrolü (örnek)
    if (email === "demo@example.com" && password === "123456") {
      router.push("/dashboard"); // Örnek yönlendirme
    } else {
      alert("Geçersiz e-posta veya şifre.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Giriş Yap</h2>
        <input
          type="email"
          placeholder="E-posta"
          className="w-full p-2 mb-3 border border-gray-300 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Şifre"
          className="w-full p-2 mb-4 border border-gray-300 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Giriş Yap
        </button>
        <p className="text-center mt-4">
          Hesabınız yok mu?{" "}
          <a href="/auth/register" className="text-blue-600 underline">
            Kayıt Ol
          </a>
        </p>
      </form>
    </div>
  );
}
