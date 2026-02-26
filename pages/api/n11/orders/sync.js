import { n11GetOrders } from '@/lib/marketplaces/n11Service';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

    await connectToDatabase();
    const db = await import('@/lib/mongodb').then(m => m.getDb());

    let allOrders = [];
    let currentPage = 0;
    let hasMore = true;
    const pageSize = 100;

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
                createdAt: new Date(order.createDate),
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        }));

        await db.collection('orders').bulkWrite(bulkOps);
        currentPage++;
        hasMore = result.orders.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json({
      success: true,
      message: `${allOrders.length} sipariş senkronize edildi`,
      count: allOrders.length
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    
    return res.status(500).json({
      error: 'Senkronizasyon hatası',
      message: error.message
    });
  }
}