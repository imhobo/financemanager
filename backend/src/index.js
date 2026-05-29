import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema } from './schema.js';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import liabilityRoutes from './routes/liabilities.js';
import networthRoutes from './routes/networth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/liabilities', liabilityRoutes);
app.use('/api/net-worth', networthRoutes);

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

async function start() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`FinanceManager running on http://localhost:${PORT}`);
  });
}

start();
