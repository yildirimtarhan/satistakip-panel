// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI eksik!");

let client;
let clientPromise;

// 🔥 Render uyumlu lazy connect (Production için)
if (process.env.NODE_ENV === "development") {
  // DEV ortamı — Hot reload için global cache
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // PROD ortamı — Sunucu ilk açıldığında bağlanma!
  // Bağlantıyı ilk API isteği sırasında yap
  clientPromise = (async () => {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    return client;
  })();
}

export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db("satistakip");
  return { client, db };
}

export default clientPromise;
