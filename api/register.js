import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userNumber = await redis.incr('tigernetwork:user_counter');
  await redis.set(`user:${userNumber}`, { created: Date.now() });

  res.status(200).json({ username: String(userNumber) });
}
