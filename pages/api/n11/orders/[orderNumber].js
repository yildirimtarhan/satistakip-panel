import { n11GetOrders } from '@/lib/marketplaces/n11Service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  const { orderNumber } = req.query;

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token gerekli' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { companyId, userId } = decoded;

    // Not: N11 SOAP OrderDetail genelde "id" ister. Elimizde orderNumber olduğu için
    // önce OrderList'i orderNumber ile filtreleyip ilk kaydı döndürüyoruz.
    const result = await n11GetOrders({
      companyId,
      userId,
      searchData: { orderNumber: String(orderNumber || '') },
      pagingData: { currentPage: 0, pageSize: 1 },
    });

    return res.status(200).json({
      success: true,
      data: result?.orders?.[0] || null,
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    
    return res.status(500).json({
      error: 'Sipariş detayı alınamadı',
      message: error.message
    });
  }
}