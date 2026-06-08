import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import client from 'prom-client';
import orderRoutes from './routes/order';
import { createOrdersTable } from './models/order';

const app = express();
const PORT = process.env.PORT || 3003;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'order_service_http_requests_total',
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

app.use('/api/orders', orderRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function start() {
  await createOrdersTable();
  app.listen(PORT, () => {
    console.log(`Order Service çalışıyor → http://localhost:${PORT}`);
  });
}

start();
