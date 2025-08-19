const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Log = require('../models/Log');
const { faker } = require('@faker-js/faker');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User Model', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  test('create and save user successfully', async () => {
    const userData = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      role: 'user',
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe('user');
  });

  test('should not allow duplicate emails', async () => {
    const userData = {
      name: faker.person.fullName(),
      email: 'duplicate@example.com',
      password: 'password123',
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User(userData);
    let error;
    try {
      await user2.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe('MongoServerError');
    expect(error.code).toBe(11000); // duplicate key error code
  });

  test('role field only allows "user" or "admin"', async () => {
    const user = new User({
      name: 'Test',
      email: faker.internet.email(),
      password: 'password',
      role: 'admin',
    });
    await expect(user.save()).resolves.toBeDefined();

    const badUser = new User({
      name: 'Bad',
      email: faker.internet.email(),
      password: 'password',
      role: 'superuser',
    });
    await expect(badUser.save()).rejects.toThrow();
  });
});

describe('Device Model', () => {
  beforeEach(async () => {
    await Device.deleteMany({});
  });

  test('create device with valid enum status', async () => {
    const device = new Device({
      name: 'Test Device',
      type: 'sensor',
      status: 'active',
      owner_id: new mongoose.Types.ObjectId(),
    });

    const saved = await device.save();
    expect(saved.status).toBe('active');
  });

  test('fail to create device with invalid status', async () => {
    const device = new Device({
      name: 'Invalid Device',
      type: 'sensor',
      status: 'unknown',
      owner_id: new mongoose.Types.ObjectId(),
    });

    await expect(device.save()).rejects.toThrow();
  });
});

describe('Log Model', () => {
  beforeEach(async () => {
    await Log.deleteMany({});
  });

  test('create log with defaults', async () => {
    const log = new Log({
      device_id: new mongoose.Types.ObjectId(),
      event: 'units_consumed',
      value: 5.5,
    });

    const saved = await log.save();
    expect(saved.timestamp).toBeDefined();
    expect(saved.event).toBe('units_consumed');
    expect(saved.value).toBe(5.5);
  });
});
