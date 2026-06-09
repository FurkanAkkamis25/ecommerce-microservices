import request from 'supertest';
import express from 'express';
import productRoutes from '../routes/product';

jest.mock('../models/product', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 1;
    next();
  },
}));

import { pool } from '../models/product';
const mockQuery = pool.query as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

describe('Product Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/products', () => {
    it('ürün listesini döner', async () => {
      const fakeProducts = [
        { id: 1, name: 'iPhone 15', price: '45000.00', stock: 10 },
        { id: 2, name: 'Samsung S24', price: '35000.00', stock: 5 },
      ];
      mockQuery.mockResolvedValueOnce({ rows: fakeProducts });

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(2);
      expect(res.body.products[0].name).toBe('iPhone 15');
    });
  });

  describe('GET /api/products/:id', () => {
    it('ürün bulunamazsa 404 döner', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/products/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ürün bulunamadı');
    });

    it('ürün varsa 200 döner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'iPhone 15', price: '45000.00', stock: 10 }],
      });

      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('iPhone 15');
    });
  });

  describe('POST /api/products', () => {
    it('eksik alan olunca 400 döner', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Test Ürün' });

      expect(res.status).toBe(400);
    });

    it('geçerli ürün 201 döner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Yeni Ürün', price: '1000.00', stock: 5 }],
      });

      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Yeni Ürün', price: 1000, stock: 5 });

      expect(res.status).toBe(201);
      expect(res.body.product.name).toBe('Yeni Ürün');
    });
  });

  describe('PATCH /api/products/:id/stock', () => {
    it('geçersiz miktar olunca 400 döner', async () => {
      const res = await request(app)
        .patch('/api/products/1/stock')
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
    });

    it('yetersiz stok olunca 400 döner', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/api/products/1/stock')
        .send({ quantity: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Yetersiz stok veya ürün bulunamadı');
    });
  });
});
