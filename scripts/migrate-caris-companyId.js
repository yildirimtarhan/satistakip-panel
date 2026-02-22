import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

console.log("🔥 ENV TEST:", process.env.MONGODB_URI);

// ❌ Static import kaldırıldı
// import dbConnect from "../lib/mongodb.js";

async function migrate() {
  // ✅ Dynamic import (dotenv sonrası)
  const { default: dbConnect } = await import("../lib/mongodb.js");

  const { default: Cari } = await import("../models/Cari.js");
  const { default: User } = await import("../models/User.js");

  await dbConnect();

  console.log("🚀 Cari migration başladı...");

  const cariler = await Cari.find({
    companyId: { $exists: false },
  });

  console.log("Bulunan eski cari:", cariler.length);

  let updated = 0;

  for (const cari of cariler) {
    if (!cari.userId) continue;

    const user = await User.findById(cari.userId);
    if (!user?.companyId) continue;

    cari.companyId = user.companyId;
    await cari.save();

    updated++;
    console.log("✅ Güncellendi:", cari.unvan || cari.ad);
  }

  console.log("🎉 Migration tamamlandı. Güncellenen:", updated);
  process.exit();
}

migrate();
