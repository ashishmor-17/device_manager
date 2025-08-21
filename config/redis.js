const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URI || 'redis://localhost:6379',
});

client.on('connect', () => {
  console.log('[Redis] Connecting...');
});
client.on('ready', () => {
  console.log('[Redis] Ready to use');
});
client.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...');
});
client.on('end', () => {
  console.log('[Redis] Connection closed');
});
client.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

let isConnected = false;

async function connectRedis() {
  if (isConnected) return client;
  await client.connect();
  isConnected = true;
  console.log('[Redis] Connected');
  return client;
}

module.exports = { client, connectRedis };
