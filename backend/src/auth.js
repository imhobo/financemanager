import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

const googleClient = new OAuth2Client(CLIENT_ID);

export async function verifyGoogleToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: CLIENT_ID,
  });
  return ticket.getPayload();
}

export function createSessionToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifySessionToken(token) {
  return jwt.verify(token, SESSION_SECRET);
}
