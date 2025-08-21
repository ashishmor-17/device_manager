const { client } = require('../config/redis');

const setJSON = async (key, ttlSeconds, payload) => {
  console.log(`[Cache] Store ${key} (TTL ${ttlSeconds}s)`);
  return client.setEx(key, ttlSeconds, JSON.stringify(payload));
};

const getJSON = async (key) => {
  const raw = await client.get(key);
  if (raw) {
    console.log(`[Cache] Hit ${key}`);
    return JSON.parse(raw);
  }
  console.log(`[Cache] Miss ${key}`);
  return null;
};

const delByPattern = async (pattern) => {
  const keys = await client.keys(pattern);
  if (!keys.length) return 0;
  const res = await client.del(keys);
  keys.forEach((k) => console.log(`[Cache] Invalidated ${k}`));
  return res;
};

const cacheResponse = (keyBuilder, ttlSeconds) => {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);
      const cached = await getJSON(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      // wrap res.json to store payload before sending
      const orig = res.json.bind(res);
      res.json = async (body) => {
        // don’t cache errors
        if (res.statusCode < 400) {
          await setJSON(key, ttlSeconds, body);
          res.set('X-Cache', 'MISS-STORE');
        }
        return orig(body);
      };
      next();
    } catch (e) {
      console.error('[Cache] middleware error:', e.message);
      next();
    }
  };
};

module.exports = {
  cacheResponse,
  setJSON,
  getJSON,
  delByPattern,
};
