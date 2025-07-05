const { createClient } = require('redis');
const logger = require('../middleware/logger');

class RedisClient {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: false, // Disable automatic reconnect attempts
      },
    });

    this.clientErrorLogged = false;
    this.client.on('error', (err) => {
      if (!this.clientErrorLogged) {
        logger.error('Redis Client Error', err);
        this.clientErrorLogged = true;
      }
    });
    this.connected = false;
    this.connect();
  }

  async connect() {
    if (this.connected) return;
    try {
      await this.client.connect();
      this.connected = true;
      logger.info('Connected to Redis');
    } catch (err) {
      logger.error('Failed to connect to Redis', err);
      logger.warn(
        'Redis is not available. Caching will be disabled or unavailable.'
      );
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.connected) return;
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
  }

  async get(key) {
    if (!this.connected) return null;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key) {
    if (!this.connected) return;
    await this.client.del(key);
  }

  async disconnect() {
    if (!this.connected) return;
    await this.client.disconnect();
    this.connected = false;
  }
}

module.exports = new RedisClient();
