/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Render Deployment için
  output: "standalone",

  // ✅ Render'ın port değişkenini kullanması için
  env: {
    PORT: process.env.PORT || 10000,
  },

  images: {
    domains: [
      "localhost",
      "www.satistakip.online",
      "res.cloudinary.com" // ✅ Cloudinary
    ],
  },
};

export default nextConfig;
