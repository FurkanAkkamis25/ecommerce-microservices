import { Router, Response } from 'express';
import axios from 'axios';
import { pool } from '../models/order';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    res.status(400).json({ error: 'Ürün id ve geçerli bir miktar zorunludur' });
    return;
  }

  try {
    // Ürünü ve fiyatını Product Service'ten al
    const productRes = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${product_id}`);
    const product = productRes.data.product;

    if (!product) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({ error: 'Yetersiz stok' });
      return;
    }

    const total_price = parseFloat(product.price) * quantity;

    // Product Service'te stok düş
    await axios.patch(`${PRODUCT_SERVICE_URL}/api/products/${product_id}/stock`, { quantity });

    // Siparişi kaydet
    const result = await pool.query(
      'INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, product_id, quantity, total_price, 'confirmed']
    );

    res.status(201).json({ order: result.rows[0] });
  } catch (err: any) {
    if (err.response?.status === 400) {
      res.status(400).json({ error: err.response.data.error });
      return;
    }
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sipariş bulunamadı' });
      return;
    }

    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
       RETURNING *`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sipariş bulunamadı veya zaten iptal edilmiş' });
      return;
    }

    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
