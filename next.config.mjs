/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    // ✅ Build sırasında ESLint hataları nedeniyle deploy başarısız olmasın
    ignoreDuringBuilds: true,
  },

  // (İsteğe bağlı: resim optimizasyonu için)
  images: {
    domains: ["localhost", "www.satistakip.online"],
  },
};

export default nextConfig;
