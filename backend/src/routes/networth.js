import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const assets = await query('SELECT COALESCE(SUM(value), 0) AS total FROM assets WHERE user_id = $1', [req.userId]);
  const liabilities = await query('SELECT COALESCE(SUM(value), 0) AS total FROM liabilities WHERE user_id = $1', [req.userId]);
  const totalAssets = parseFloat(assets.rows[0].total);
  const totalLiabilities = parseFloat(liabilities.rows[0].total);
  const netWorth = totalAssets - totalLiabilities;

  const snapshots = await query(
    'SELECT * FROM net_worth_snapshots WHERE user_id = $1 ORDER BY snapped_at DESC LIMIT 60',
    [req.userId]
  );

  res.json({
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: netWorth,
    history: snapshots.rows.map(r => ({
      date: r.snapped_at,
      total_assets: r.total_assets,
      total_liabilities: r.total_liabilities,
      net_worth: r.net_worth,
    })).reverse()
  });
});

export default router;
