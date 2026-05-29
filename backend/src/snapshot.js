import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';

export async function takeSnapshot(userId) {
  const assets = await query('SELECT COALESCE(SUM(value), 0) AS total FROM assets WHERE user_id = $1', [userId]);
  const liabilities = await query('SELECT COALESCE(SUM(value), 0) AS total FROM liabilities WHERE user_id = $1', [userId]);
  const totalAssets = parseFloat(assets.rows[0].total);
  const totalLiabilities = parseFloat(liabilities.rows[0].total);
  const netWorth = totalAssets - totalLiabilities;

  const id = uuidv4();
  await query(
    `INSERT INTO net_worth_snapshots (id, user_id, total_assets, total_liabilities, net_worth)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, totalAssets, totalLiabilities, netWorth]
  );
}
