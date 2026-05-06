import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Atomically increment — safe if two people log on at the same time
  const userNumber = await kv.incr('tigernetwork:user_counter');

  // Store permanently (no expiry — their number is theirs forever)
  await kv.set(`user:${userNumber}`, { created: Date.now() });

  res.status(200).json({ username: String(userNumber) });
}
