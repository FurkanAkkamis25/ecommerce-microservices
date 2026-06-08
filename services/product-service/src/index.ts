import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import client from 'prom-client';
import productRoutes from './routes/product';
import { createProductsTable } from './models/product';

const app = express();
const PORT = process.env.PORT || 3002;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'product_service_http_requests_total',
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

app.use('/api/products', productRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function start() {
  await createProductsTable();
  app.listen(PORT, () => {
    console.log(`Product Service çalışıyor → http://localhost:${PORT}`);
  });
}

start();
