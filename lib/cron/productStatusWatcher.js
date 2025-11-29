// 📁 /lib/cron/productStatusWatcher.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { n11GetApprovalStatus } from "@/lib/marketplaces/n11Service";

export async function runN11StatusWatcher() {
  try {
    await dbConnect();

    // 1️⃣ N11 durumundan "Pending" olan ürünleri çek
    const pendingProducts = await Product.find({
      "marketplaces.n11.status": "Pending",
      "marketplaces.n11.taskId": { $ne: null }
    });

    if (pendingProducts.length === 0) {
      console.log("🔄 N11: Takip edilecek pending ürün yok.");
      return;
    }

    console.log(`🔍 N11: ${pendingProducts.length} üründe onay kontrolü yapılıyor...`);

    // 2️⃣ Her ürün için task durumunu çek
    for (const product of pendingProducts) {
      const taskId = product.marketplaces.n11.taskId;

      const statusResult = await n11GetApprovalStatus(taskId);

      if (!statusResult.success) {
        console.log(`⚠ N11 task durumu alınamadı: ${statusResult.message}`);
        continue;
      }

      const { taskStatus, productId, errorReason } = statusResult;

      // 3️⃣ PENDING → henüz bitmemiş
      if (taskStatus === "PENDING") {
        console.log(`⏳ N11: Ürün hala onay sürecinde (taskId: ${taskId})`);
        continue;
      }

      // 4️⃣ ONAYLANDI
      if (taskStatus === "COMPLETED" && productId) {
        await Product.findByIdAndUpdate(product._id, {
          $set: {
            "marketplaces.n11.status": "Approved",
            "marketplaces.n11.productId": productId,
            "marketplaces.n11.message": "Ürün N11 tarafından onaylandı.",
            "marketplaces.n11.updatedAt": new Date(),
            "approvalTracking.n11.isCompleted": true
          }
        });

        console.log(`✅ N11: Ürün onaylandı → productId: ${productId}`);
        continue;
      }

      // 5️⃣ REDDEDİLDİ
      if (taskStatus === "COMPLETED" && !productId) {
        await Product.findByIdAndUpdate(product._id, {
          $set: {
            "marketplaces.n11.status": "Rejected",
            "marketplaces.n11.message": errorReason || "Reddedildi",
            "marketplaces.n11.updatedAt": new Date(),
            "approvalTracking.n11.isCompleted": true
          }
        });

        console.log(`❌ N11: Ürün REDDEDİLDİ → ${errorReason}`);
        continue;
      }
    }
  } catch (err) {
    console.error("❌ N11 STATUS WATCHER ERROR:", err);
  }
}
