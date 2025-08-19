const request = require('supertest');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const app = require('../server');
const User = require('../models/User');
const Device = require('../models/Device');

let token;
let deviceId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  }
  await User.deleteMany({});
  await Device.deleteMany({});

  // creating test user with random data and login using faker
  const userData = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  };

  await request(app).post('/auth/signup').send(userData);

  const res = await request(app).post('/auth/login').send({
    email: userData.email,
    password: userData.password,
  });

  token = res.body.token;
});

afterAll(async () => {
  await User.deleteMany({});
  await Device.deleteMany({});
  await mongoose.connection.close();
});

describe('Device Routes', () => {
  test('POST /devices - register device with random data', async () => {
    const deviceData = {
      name: faker.commerce.productName(),
      type: faker.helpers.arrayElement(['temperature', 'humidity', 'motion', 'light']),
      status: faker.helpers.arrayElement(['active', 'inactive']),
    };

    const res = await request(app)
      .post('/devices')
      .set('Authorization', `Bearer ${token}`)
      .send(deviceData);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.device.name).toBe(deviceData.name);
    deviceId = res.body.device._id;
  });

  test('GET /devices - get devices', async () => {
    const res = await request(app)
      .get('/devices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.devices)).toBe(true);
  });

  test('POST /devices/:id/heartbeat - update heartbeat with random status', async () => {
    const res = await request(app)
      .post(`/devices/${deviceId}/heartbeat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: faker.helpers.arrayElement(['active', 'inactive']) });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/heartbeat/i);
  });

  test('POST /devices/:id/logs - create log with random event and value', async () => {
    const logData = {
      event: faker.helpers.arrayElement(['units_consumed', 'temperature_change', 'device_error']),
      value: faker.number.int({ min: 1, max: 100 }),
    };

    const res = await request(app)
      .post(`/devices/${deviceId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .send(logData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.log).toHaveProperty('event', logData.event);
  });

  test('GET /devices/:id/logs - get logs', async () => {
    const res = await request(app)
      .get(`/devices/${deviceId}/logs`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  test('GET /devices/:id/usage - get usage', async () => {
    const res = await request(app)
      .get(`/devices/${deviceId}/usage?range=24h`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('total_units_consumed');
  });
});
