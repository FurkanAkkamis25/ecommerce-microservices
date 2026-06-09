import request from 'supertest';
import express from 'express';
import orderRoutes from '../routes/order';

jest.mock('../models/order', () => ({
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

jest.mock('axios');
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

import { pool } from '../models/order';
const mockQuery = pool.query as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

describe('Order Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/orders', () => {
    it('eksik alan olunca 400 döner', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ product_id: 1 });

      expect(res.status).toBe(400);
    });

    it('geçersiz miktar olunca 400 döner', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ product_id: 1, quantity: 0 });

      expect(res.status).toBe(400);
    });

    it('ürün bulunamazsa 404 döner', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { product: null } });

      const res = await request(app)
        .post('/api/orders')
        .send({ product_id: 999, quantity: 1 });

      expect(res.status).toBe(404);
    });

    it('yetersiz stok olunca 400 döner', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { product: { id: 1, name: 'iPhone', price: '45000', stock: 2 } },
      });

      const res = await request(app)
        .post('/api/orders')
        .send({ product_id: 1, quantity: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Yetersiz stok');
    });

    it('geçerli sipariş 201 döner', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { product: { id: 1, name: 'iPhone', price: '45000', stock: 10 } },
      });
      mockAxios.patch.mockResolvedValueOnce({ data: {} });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, product_id: 1, quantity: 2, total_price: '90000', status: 'confirmed' }],
      });

      const res = await request(app)
        .post('/api/orders')
        .send({ product_id: 1, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.order.total_price).toBe('90000');
      expect(res.body.order.status).toBe('confirmed');
    });
  });

  describe('GET /api/orders', () => {
    it('kullanıcının siparişlerini döner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, user_id: 1, product_id: 1, quantity: 2, status: 'confirmed' },
        ],
      });

      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
    });
  });
});
