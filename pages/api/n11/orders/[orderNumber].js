import { n11GetOrderDetail } from '@/lib/marketplaces/n11Service';
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

    const result = await n11GetOrderDetail({
      companyId,
      userId,
      orderId: orderNumber,
    });

    return res.status(200).json({
      success: true,
      data: result.order
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