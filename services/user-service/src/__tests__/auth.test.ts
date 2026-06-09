import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';

// DB bağlantısını mock'la
jest.mock('../models/user', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../models/user';
const mockQuery = pool.query as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/users', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/users/register', () => {
    it('eksik alan olunca 400 döner', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('email zaten kayıtlıysa 409 döner', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .post('/api/users/register')
        .send({ name: 'Test', email: 'var@test.com', password: '123456' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Bu email zaten kayıtlı');
    });

    it('geçerli bilgilerle 201 döner', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Test', email: 'yeni@test.com', created_at: new Date() }],
        });

      const res = await request(app)
        .post('/api/users/register')
        .send({ name: 'Test', email: 'yeni@test.com', password: '123456' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('yeni@test.com');
    });
  });

  describe('POST /api/users/login', () => {
    it('eksik alan olunca 400 döner', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('kullanıcı bulunamazsa 401 döner', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'yok@test.com', password: '123456' });

      expect(res.status).toBe(401);
    });
  });
});
