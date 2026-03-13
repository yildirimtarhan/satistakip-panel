import { n11GetOrders } from '@/lib/marketplaces/n11Service';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { parseN11Date } from '@/utils/formatters';
import N11Order from '@/models/N11Order';
import Cari from '@/models/Cari';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import { createPazaryeriBorcAndUpdateBakiye } from '@/lib/pazaryeriCari';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function normalizePhoneTR(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length >= 11) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function extractN11CustomerId(order = {}) {
  return (
    order?.buyer?.id ||
    order?.buyer?.customerId ||
    order?.buyerId ||
    order?.customerId ||
    ''
  );
}

function extractOrderItems(order = {}) {
  const rawItems =
    order?.orderItemList?.orderItem ||
    order?.itemList?.item ||
    order?.items?.item ||
    order?.orderItems ||
    order?.lines ||
    [];
  return ensureArray(rawItems);
}

function extractBuyer(order = {}) {
  const buyer = order?.buyer || {};
  const recipient = order?.recipient;
  const recipientObj = recipient && typeof recipient === 'object' ? recipient : {};
  const shipping = order?.shippingAddress || {};
  const billing = order?.billingAddress || {};

  const fullName =
    buyer.fullName ||
    (typeof recipient === 'string' ? recipient : recipientObj.fullName) ||
    shipping.fullName ||
    billing.fullName ||
    order?.buyerName ||
    'N11 Müşteri';

  const email = (buyer.email || (recipientObj && recipientObj.email) || '').trim().toLowerCase();
  const phoneRaw = buyer.gsm || (recipientObj && recipientObj.gsm) || buyer.phone || '';
  const phone = normalizePhoneTR(phoneRaw);

  return { fullName, email, phone };
}

async function resolveCariForN11({ companyIdObj, userId, order }) {
  const { fullName, email, phone } = extractBuyer(order);
  const n11CustomerId = String(extractN11CustomerId(order) || '');

  const baseQuery = {
    ...(companyIdObj ? { companyId: companyIdObj } : {}),
  };

  const or = [];
  if (n11CustomerId) or.push({ n11CustomerId });
  if (email) or.push({ email });
  if (phone) or.push({ telefon: phone });

  let cari = null;
  if (or.length) {
    cari = await Cari.findOne({ ...baseQuery, $or: or });
  }

  if (!cari) {
    cari = await Cari.create({
      ...(companyIdObj ? { companyId: companyIdObj } : {}),
      ...(userId ? { userId } : {}),
      ad: fullName,
      email: email || '',
      telefon: phone || '',
      n11CustomerId: n11CustomerId || '',
    });
  } else {
    let changed = false;
    if (n11CustomerId && !cari.n11CustomerId) {
      cari.n11CustomerId = n11CustomerId;
      changed = true;
    }
    // N11 müşterilerini caride kendi isimleriyle listele: gerçek isim geldiğinde her zaman güncelle
    if (fullName && fullName !== 'N11 Müşteri' && String(fullName).trim()) {
      if (String(cari.ad || '').trim() !== String(fullName).trim()) {
        cari.ad = fullName.trim();
        changed = true;
      }
    }
    if (email && !cari.email) {
      cari.email = email;
      changed = true;
    }
    if (phone && !cari.telefon) {
      cari.telefon = phone;
      changed = true;
    }
    if (changed) await cari.save();
  }

  return cari;
}

async function createSaleFromN11Order({ decodedUserId, decodedCompanyId, cariId, order, accountDisplayName }) {
  const orderNumber = String(order?.orderNumber || '');
  const saleNo = `N11-${orderNumber}`;

  const exists = await Transaction.findOne({
    type: 'sale',
    saleNo,
    userId: decodedUserId,
    isDeleted: { $ne: true },
  }).lean();

  if (exists) {
    return { already: true, saleNo, transactionId: exists._id };
  }

  const items = extractOrderItems(order).map((it) => {
    const sku = String(it.productSellerCode || it.sellerProductCode || it.stockCode || it.sku || '').trim();
    const barcode = String(it.barcode || '').trim();
    const quantity = Number(it.quantity || 1);
    const unitPrice = Number(it.price ?? it.unitPrice ?? it.sellerInvoiceAmount ?? 0);
    const name = it.productName || it.title || sku || barcode || 'N11 Ürün';
    return { sku, barcode, quantity, unitPrice, vatRate: 20, name };
  });

  if (!items.length) throw new Error('Sipariş kalemi bulunamadı');

  const companyIdObj =
    decodedCompanyId && mongoose.Types.ObjectId.isValid(decodedCompanyId)
      ? new mongoose.Types.ObjectId(decodedCompanyId)
      : null;

  const saleItems = [];
  const missing = [];
  for (const it of items) {
    if (it.quantity <= 0) throw new Error(`Geçersiz adet: ${it.sku}`);

    let product = null;
    if (it.sku) {
      product = companyIdObj
        ? await Product.findOne({ companyId: companyIdObj, sku: it.sku }).lean()
        : await Product.findOne({ sku: it.sku }).lean();
    }
    if (!product?._id && it.barcode) {
      product = companyIdObj
        ? await Product.findOne({ companyId: companyIdObj, barcode: it.barcode }).lean()
        : await Product.findOne({ barcode: it.barcode }).lean();
    }

    if (!product?._id) {
      missing.push(it.sku || it.barcode || it.name);
      saleItems.push({
        productId: null,
        name: it.name,
        barcode: it.barcode || '',
        sku: it.sku || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: Number(it.vatRate ?? 20),
      });
      continue;
    }

    saleItems.push({
      productId: product._id,
      name: product.name || it.name,
      barcode: product.barcode || it.barcode || '',
      sku: product.sku || it.sku || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      vatRate: Number(product.vatRate ?? it.vatRate ?? 20),
    });
  }

  // TOPLAMLAR (satis/create ile aynı yaklaşım)
  let subTotal = 0;
  let vatTotal = 0;
  const normalizedItems = saleItems.map((i) => {
    const qty = Number(i.quantity || 1);
    const price = Number(i.unitPrice || 0);
    const vatRate = Number(i.vatRate || 0);
    const lineSub = qty * price;
    const lineVat = lineSub * (vatRate / 100);
    subTotal += lineSub;
    vatTotal += lineVat;
    return {
      ...i,
      total: lineSub + lineVat,
      currency: 'TRY',
      fxRate: 1,
    };
  });

  const grandTotal = subTotal + vatTotal;
  const totalTRY = grandTotal;

  const nameForErp = accountDisplayName || extractBuyer(order).fullName;
  const accountName = (typeof nameForErp === 'string' && nameForErp.trim() && nameForErp !== 'N11 Müşteri') ? nameForErp.trim() : '';
  const saleDate = parseN11Date(order.createDate) || new Date();
  const tx = await Transaction.create({
    userId: decodedUserId,
    companyId: decodedCompanyId || '',
    createdBy: decodedUserId,
    type: 'sale',
    saleNo,
    accountId: cariId,
    accountName,
    date: saleDate,
    paymentMethod: 'open',
    note: 'N11 siparişi otomatik satış',
    currency: 'TRY',
    fxRate: 1,
    items: normalizedItems,
    totalTRY,
    direction: 'borc',
    amount: totalTRY,
  });

  // Pazaryeri muhasebe: N11 carisine borç (platformun size borcu)
  if (companyIdObj) {
    await createPazaryeriBorcAndUpdateBakiye({
      pazaryeriAd: 'N11',
      companyIdObj,
      companyIdStr: decodedCompanyId || '',
      userIdStr: decodedUserId,
      userIdObj: mongoose.Types.ObjectId.isValid(decodedUserId) ? new mongoose.Types.ObjectId(decodedUserId) : null,
      saleNo,
      totalTRY,
      note: `N11 sipariş ${order?.orderNumber || ''}`,
      date: saleDate,
    });
  }

  // STOK DÜŞ
  for (const i of normalizedItems) {
    if (i.productId) {
      await Product.findByIdAndUpdate(i.productId, { $inc: { stock: -i.quantity } });
    }
  }

  // Ortak stok → pazaryerlerine anlık push
  const { pushStockToMarketplaces } = await import("@/lib/pazaryeriStockSync");
  const affectedIds = normalizedItems.filter((i) => i.productId).map((i) => i.productId);
  if (affectedIds.length && decodedCompanyId) {
    pushStockToMarketplaces(affectedIds, { companyId: decodedCompanyId, userId: decodedUserId });
  }

  return { already: false, saleNo, transactionId: tx._id, missingProducts: missing };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token gerekli' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { companyId, userId } = decoded;

    const { startDate, endDate, status } = req.body;

    const companyIdStr = String(companyId || '');
    const userIdStr = String(userId || decoded?.id || '');
    const companyIdObj = mongoose.Types.ObjectId.isValid(companyIdStr)
      ? new mongoose.Types.ObjectId(companyIdStr)
      : null;
    const userIdObj = mongoose.Types.ObjectId.isValid(userIdStr)
      ? new mongoose.Types.ObjectId(userIdStr)
      : null;

    if (!companyIdObj) {
      return res.status(400).json({ error: 'companyId geçersiz' });
    }
    if (!userIdObj) {
      return res.status(400).json({ error: 'userId geçersiz' });
    }

    // Mongoose bağlantısı (Cari/N11Order/Transaction için)
    await dbConnect();

    const { db } = await connectToDatabase();

    let allOrders = [];
    let currentPage = 0;
    let hasMore = true;
    const pageSize = 100;

    let cariLinked = 0;
    let salesCreated = 0;
    let salesSkipped = 0;
    const salesFailed = [];

    while (hasMore) {
      const result = await n11GetOrders({
        companyId,
        userId,
        searchData: {
          status,
          ...(startDate && endDate ? {
            period: { startDate, endDate }
          } : {}),
        },
        pagingData: { currentPage, pageSize }
      });

      if (result.orders?.length > 0) {
        allOrders = allOrders.concat(result.orders);
        
        const bulkOps = result.orders.map(order => ({
          updateOne: {
            filter: { orderNumber: order.orderNumber, platform: 'n11' },
            update: {
              $set: {
                companyId,
                platform: 'n11',
                n11Data: order,
                status: order.status,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                buyerName: order.buyer?.fullName,
                createdAt: parseN11Date(order.createDate) || new Date(),
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        }));

        await db.collection('orders').bulkWrite(bulkOps);

        // ✅ ERP otomatik: Cari oluştur/bağla + satış oluştur (idempotent)
        for (const order of result.orders) {
          const orderNumber = String(order?.orderNumber || '');
          if (!orderNumber) continue;

          const filter = { companyId: companyIdObj, orderNumber };

          const buyer = extractBuyer(order);
          const n11CustomerId = String(extractN11CustomerId(order) || '');
          const itemCount = extractOrderItems(order).length;

          const orderDoc = await N11Order.findOneAndUpdate(
            filter,
            {
              $set: {
                companyId: companyIdObj,
                userId: userIdObj,
                orderNumber,
                orderId: order.id,
                status: String(order.status ?? ''),
                buyerName: buyer.fullName,
                buyerEmail: buyer.email,
                buyerPhone: buyer.phone,
                n11CustomerId,
                quantity: itemCount,
                totalAmount: Number(order.totalAmount || order.paymentAmount || order.amount || 0),
                raw: order,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          let cariForSale = null;
          if (!orderDoc.accountId) {
            cariForSale = await resolveCariForN11({
              companyIdObj,
              userId: userIdObj,
              order,
            });
            orderDoc.accountId = cariForSale._id;
            orderDoc.cariId = cariForSale._id;
            await orderDoc.save();
            cariLinked++;
          } else {
            cariForSale = await Cari.findById(orderDoc.accountId).lean();
          }

          // Satış oluştur (daha önce yapılmadıysa)
          if (!orderDoc.erpPushed) {
            try {
              const saleRes = await createSaleFromN11Order({
                decodedUserId: userIdStr,
                decodedCompanyId: companyIdStr,
                cariId: orderDoc.accountId,
                order,
                accountDisplayName: cariForSale?.ad,
              });

              orderDoc.erpPushed = true;
              orderDoc.erpPushedAt = new Date();
              orderDoc.erpSaleNo = saleRes.saleNo;
              orderDoc.erpTransactionId = saleRes.transactionId;
              if (saleRes.missingProducts?.length) {
                orderDoc.note = `ERP satış oluşturuldu fakat eşleşmeyen ürünler var: ${saleRes.missingProducts.slice(0, 10).join(', ')}`;
              }
              await orderDoc.save();

              if (saleRes.already) salesSkipped++;
              else salesCreated++;
            } catch (e) {
              orderDoc.note = `ERP satış oluşturulamadı: ${e.message || String(e)}`;
              await orderDoc.save();
              salesFailed.push({ orderNumber, error: e.message || String(e) });
            }
          }
        }

        currentPage++;
        hasMore = result.orders.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json({
      success: true,
      message: `${allOrders.length} sipariş senkronize edildi (Cari + ERP otomatik işlendi)`,
      count: allOrders.length,
      cariLinked,
      salesCreated,
      salesSkipped,
      salesFailed: salesFailed.slice(0, 20),
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    console.error('[N11 Sync] Hata:', error.message, error.stack);
    return res.status(500).json({
      error: 'Senkronizasyon hatası',
      message: error.message || String(error)
    });
  }
}