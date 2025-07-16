export default async function handler(req, res) {
  // Çıkış yap: cookie’yi sil
  res.setHeader("Set-Cookie", "token=; Max-Age=0; Path=/;");
  res.status(200).json({ message: "Çıkış yapıldı" });
}
