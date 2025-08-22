const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Device = require('../models/Device');
const Log = require('../models/Log');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Mongoose Models', () => {
  describe('User', () => {
    it('should create and save a user', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_pw',
        role: 'admin',
      });

      const saved = await user.save();
      expect(saved._id).toBeDefined();
      expect(saved.email).toBe('test@example.com');
    });

    it('should not allow duplicate emails', async () => {
      const user1 = new User({
        name: 'Alice',
        email: 'duplicate@example.com',
        password: 'pw123',
      });

      const user2 = new User({
        name: 'Bob',
        email: 'duplicate@example.com',
        password: 'pw456',
      });

      await user1.save();
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Device', () => {
    it('should create and save a device', async () => {
      const device = new Device({
        name: 'Thermostat',
        type: 'sensor',
        status: 'active',
        last_active_at: new Date(),
        owner_id: new mongoose.Types.ObjectId(),
      });

      const saved = await device.save();
      expect(saved._id).toBeDefined();
      expect(saved.status).toBe('active');
    });

    it('should reject device with invalid status', async () => {
      const device = new Device({
        name: 'Smart Plug',
        type: 'actuator',
        status: 'broken',
        owner_id: new mongoose.Types.ObjectId(),
      });

      await expect(device.save()).rejects.toThrow();
    });
  });

  describe('Log', () => {
    it('should create and save a log', async () => {
      const log = new Log({
        device_id: new mongoose.Types.ObjectId(),
        event: 'power_on',
        value: 1,
        timestamp: new Date(),
      });

      const saved = await log.save();
      expect(saved._id).toBeDefined();
      expect(saved.event).toBe('power_on');
      expect(saved.value).toBe(1);
    });
  });
});
