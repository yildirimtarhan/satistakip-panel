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
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// ✅ connectToDatabase fonksiyonunu ekliyoruz
export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db("satistakip"); // veritabanı adını buraya yaz
  return { client, db };
}

export default clientPromise;
