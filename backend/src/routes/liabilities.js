import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';
import { takeSnapshot } from '../snapshot.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await query(
    'SELECT * FROM liabilities WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { type, name, data, value, currency, source } = req.body;
  if (!type || !name || value === undefined) {
    return res.status(400).json({ error: 'type, name, and value are required' });
  }
  const id = uuidv4();
  await query(
    `INSERT INTO liabilities (id, user_id, type, name, data, value, currency, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, req.userId, type, name, JSON.stringify(data || {}), value, currency || 'INR', source || 'manual']
  );
  const result = await query('SELECT * FROM liabilities WHERE id = $1', [id]);
  takeSnapshot(req.userId).catch(() => {});
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { type, name, data, value, currency, source } = req.body;
  const existing = await query('SELECT * FROM liabilities WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (existing.rows.length === 0) return res.status(404).json({ error: 'Liability not found' });

  await query(
    `UPDATE liabilities SET type = $1, name = $2, data = $3, value = $4, currency = $5, source = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7 AND user_id = $8`,
    [
      type ?? existing.rows[0].type,
      name ?? existing.rows[0].name,
      JSON.stringify(data ?? JSON.parse(existing.rows[0].data)),
      value ?? existing.rows[0].value,
      currency ?? existing.rows[0].currency,
      source ?? existing.rows[0].source,
      req.params.id,
      req.userId
    ]
  );
  const result = await query('SELECT * FROM liabilities WHERE id = $1', [req.params.id]);
  takeSnapshot(req.userId).catch(() => {});
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM liabilities WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Liability not found' });
  takeSnapshot(req.userId).catch(() => {});
  res.json({ message: 'Deleted' });
});

export default router;
