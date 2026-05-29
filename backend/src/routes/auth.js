import { Router } from 'express';
import { verifyGoogleToken, createSessionToken, verifySessionToken } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: 'id_token is required' });
    }

    const payload = await verifyGoogleToken(id_token);
    const googleSub = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const avatarUrl = payload.picture;

    let result = await query('SELECT * FROM users WHERE google_sub = $1', [googleSub]);
    let user;

    if (result.rows.length === 0) {
      const { v4: uuidv4 } = await import('uuid');
      const id = uuidv4();
      await query(
        'INSERT INTO users (id, google_sub, email, name, avatar_url) VALUES ($1, $2, $3, $4, $5)',
        [id, googleSub, email, name, avatarUrl]
      );
      user = { id, email, name, avatar_url: avatarUrl };
    } else {
      user = result.rows[0];
      if (user.name !== name || user.avatar_url !== avatarUrl) {
        await query('UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3', [name, avatarUrl, user.id]);
        user.name = name;
        user.avatar_url = avatarUrl;
      }
    }

    const sessionToken = createSessionToken(user);
    res.json({ session_token: sessionToken, user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const payload = verifySessionToken(authHeader.replace('Bearer ', ''));
    const result = await query('SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
