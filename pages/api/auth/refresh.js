import jwt from "jsonwebtoken";
import Cookies from "cookies"; // ⬅ Önemli: Token'ı cookie’den okuyacağız

export default async function handler(req, res) {
  try {
    // 🔥 Token hem Cookie hem Header'dan okunabilir
    const cookies = new Cookies(req, res);
    let token = cookies.get("token");

    // Eğer cookie yoksa header'dan dene
    if (!token) {
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res.status(401).json({ message: "Token bulunamadı" });

      token = authHeader.split(" ")[1];
    }

    // 🔥 Token decode et (süresi dolmuş olsa bile)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // 🔥 Yeni token oluştur
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔥 Cookie’ye yaz
    cookies.set("token", newToken, {
      httpOnly: false,     // React tarafında erişilebilsin
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res.status(200).json({
      message: "Yeni token oluşturuldu",
      token: newToken,
    });

  } catch (err) {
    console.error("Token yenileme hatası:", err);
    return res.status(401).json({ message: "Token yenileme başarısız" });
  }
}
