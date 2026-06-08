import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import client from 'prom-client';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { createUsersTable } from './models/user';

const app = express();
const PORT = process.env.PORT || 3001;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'user_service_http_requests_total',
  help: 'Toplam HTTP istek sayısı',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

app.use('/api/users', authRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function start() {
  await createUsersTable();
  app.listen(PORT, () => {
    console.log(`User Service çalışıyor → http://localhost:${PORT}`);
  });
}

start();
