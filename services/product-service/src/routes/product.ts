import { Router, Request, Response } from 'express';
import { pool } from '../models/product';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { category, search } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: (string | number)[] = [];

  if (category) {
    params.push(category as string);
    query += ` AND category = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
  }

  query += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock, category } = req.body;

  if (!name || price === undefined || stock === undefined) {
    res.status(400).json({ error: 'Ad, fiyat ve stok zorunludur' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, stock, category]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock, category } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        stock = COALESCE($4, stock),
        category = COALESCE($5, category)
       WHERE id = $6 RETURNING *`,
      [name, description, price, stock, category, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    res.json({ message: 'Ürün silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Order Service tarafından stok düşmek için çağrılır
router.patch('/:id/stock', async (req: Request, res: Response) => {
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: 'Geçerli bir miktar gerekli' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *',
      [quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Yetersiz stok veya ürün bulunamadı' });
      return;
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
