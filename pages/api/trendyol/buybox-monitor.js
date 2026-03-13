// 📁 /pages/api/trendyol/buybox-monitor.js
import { connectToDatabase } from "@/lib/mongodb";
import { priceAndInventoryUrl } from "@/lib/marketplaces/trendyolConfig";

function roundPriceTL(x) {
  // Pazaryeri alışkanlığı: .99 ile bitir, istersen değiştir.
  const v = Math.max(0, Number(x || 0));
  const r = Math.round(v); // tam TL'e yuvarla
  return r - 0.01;         // psikolojik fiyat
}

function computePrice({ baseCurrency, cost, usdtry, eurtry, marginPct, minMarginPct }) {
  // maliyeti TL'ye çevir
  let costTL = Number(cost || 0);
  if (String(baseCurrency).toUpperCase() === "USD") costTL = cost * (usdtry || 0);
  if (String(baseCurrency).toUpperCase() === "EUR") costTL = cost * (eurtry || 0);

  const minSell = costTL * (1 + (Number(minMarginPct || 0) / 100));
  const targetSell = costTL * (1 + (Number(marginPct || 0) / 100));

  return { costTL, minSell: roundPriceTL(minSell), targetSell: roundPriceTL(targetSell) };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Sadece POST" });
  }

  /**
   * Beklenen body:
   * {
   *   autoUpdate: true/false,   // true ise Trendyol'a push yapılır
   *   marginPct: 15,            // hedef kâr %
   *   minMarginPct: 10,         // alt limit kâr %
   *   items: [
   *     {
   *       barcode: "1234567890001",
   *       baseCurrency: "USD",       // USD | EUR | TRY
   *       cost: 10.50,               // maliyet (baseCurrency cinsinden)
   *       stock: 12,
   *       buyboxPriceTL: 349.90      // opsiyonel: bildiğin/hedef buybox fiyatı
   *     },
   *     ...
   *   ]
   * }
   */
  try {
    const { db } = await connectToDatabase();

    const { autoUpdate = false, marginPct = 15, minMarginPct = 10, items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "items[] gereklidir" });
    }

    // Son döviz kurunu al
    const lastFx = await db.collection("fx_rates").find().sort({ createdAt: -1 }).limit(1).toArray();
    const fx = lastFx[0]?.rates || {};
    const usdtry = Number(fx.TRY || fx.USDTRY || 0); // 1 USD = X TRY
    const eurPerUsd = Number(fx.EUR || 0);           // base=USD: 1 USD = X EUR (örn. 0.92)
    const eurtry = eurPerUsd ? usdtry / eurPerUsd : 0; // 1 EUR = usdtry/eurPerUsd TRY

    if (!usdtry) {
      return res.status(412).json({ ok: false, message: "Kur bilgisi yok. Önce /api/currency/update çağırın." });
    }

    // Hesapla
    const results = items.map((it) => {
      const { costTL, minSell, targetSell } = computePrice({
        baseCurrency: it.baseCurrency || "TRY",
        cost: Number(it.cost || 0),
        usdtry,
        eurtry,
        marginPct,
        minMarginPct,
      });

      // BuyBox hedefi varsa, (ör: rakip buybox 349.90) - min kârı koruyarak yaklaş
      let suggested = targetSell;
      if (it.buyboxPriceTL) {
        // Buybox'a %1-2 altına inmek isteyebilirsin; ama minSell altına ASLA inme
        const bbAim = Math.min(it.buyboxPriceTL - 1, targetSell); // basit strateji
        suggested = Math.max(minSell, roundPriceTL(bbAim));
      }

      const marginPct = costTL > 0 ? (((suggested - costTL) / costTL) * 100) : 0;
      return {
        barcode: it.barcode,
        stock: Number(it.stock ?? 0),
        baseCurrency: it.baseCurrency || "TRY",
        cost: Number(it.cost || 0),
        usdtry,
        eurtry,
        costTL: Number(costTL.toFixed(2)),
        minSell,
        targetSell,
        suggestedSalePrice: suggested,
        marginPct: Number(marginPct.toFixed(2)),
        listPrice: Math.max(suggested + 10, suggested + suggested * 0.08),
      };
    });

    // Auto-update aktif ise Trendyol'a push et
    let pushResp = null;
    if (autoUpdate) {
      const { getTrendyolCredentials } = await import("@/lib/getTrendyolCredentials");
      const creds = await getTrendyolCredentials(req);
      if (!creds) {
        return res.status(400).json({ ok: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
      }
      const url = priceAndInventoryUrl(creds.supplierId);
      const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
      const payload = {
        items: results.map((r) => ({
          barcode: r.barcode,
          quantity: r.stock,
          listPrice: Number(r.listPrice.toFixed(2)),
          salePrice: Number(r.suggestedSalePrice.toFixed(2)),
        })),
      };

      const tr = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "User-Agent": "satistakip_buybox/1.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const trJson = await tr.json().catch(() => ({}));
      pushResp = { status: tr.status, body: trJson };
    }

    return res.status(200).json({ ok: true, fx: { usdtry, eurtry }, results, trendyolPush: pushResp });
  } catch (e) {
    console.error("buybox-monitor error:", e);
    return res.status(500).json({ ok: false, message: "Sunucu hatası", error: e.message });
  }
}
