import { n11GetOrders } from '@/lib/marketplaces/n11Service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token gerekli' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { companyId, userId } = decoded;

    const { page = '1', size = '20', status = '' } = req.query;

    const result = await n11GetOrders({
      companyId,
      userId,
      searchData: status ? { status } : {},
      pagingData: {
        currentPage: parseInt(page) - 1,
        pageSize: parseInt(size),
      }
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(size),
        totalCount: result.pagingData?.totalCount || 0,
        totalPages: result.pagingData?.pageCount || 1
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }

    return res.status(502).json({
      error: 'N11 API hatası',
      message: error.message
    });
  }
}