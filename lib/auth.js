export async function requireAuth(req, res, next) {
  // Basit örnek: Cookie içinden kullanıcıyı kontrol et
  const isLoggedIn = req.headers.cookie?.includes("loggedIn=true");

  if (!isLoggedIn) {
    return res.writeHead(302, { Location: "/login" }).end(); // Giriş sayfasına yönlendir
  }

  // Oturum varsa devam et
  return next();
}
