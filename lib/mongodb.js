// lib/mongodb.js
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI eksik! Environment Variables kontrol et.");
}

// 🔁 Hot-reload ve serverless ortamlar için cache
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// ✅ Yeni standart: Mongoose bağlantısı
export default async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB bağlandı (mongoose)");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ MongoDB bağlantı hatası:", err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// 🔙 Eski kodla uyumluluk: connectToDatabase()
// NOT: Eski API'lerde kullanılan yapıyı bozmamak için ekliyoruz.
export async function connectToDatabase() {
  const conn = await dbConnect();
  const db = conn.connection.db; // native MongoDB Db nesnesi
  return { db };
}
