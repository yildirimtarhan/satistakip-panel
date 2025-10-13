// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  throw new Error("Lütfen .env.local dosyasına MONGODB_URI ekleyin");
}

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // Geliştirme ortamında global değişken kullan, hot-reload'da yeniden bağlanmasın
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production ortamı (Render)
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
