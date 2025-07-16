// lib/mongodb.js

import clientPromise from '../../lib/mongodb';


const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not defined in .env.local dosyan!");
}

if (process.env.NODE_ENV === "development") {
  // Geliştirme ortamında tekrar bağlantı kurmamak için global değişken kullanılır
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production ortamında her seferinde yeni bağlantı yapılır
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
