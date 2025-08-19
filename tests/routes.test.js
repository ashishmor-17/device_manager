const request = require('supertest');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const app = require('../server');
const User = require('../models/User');
const Device = require('../models/Device');
const Log = require('../models/Log');

let token;
let deviceId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  }
  await User.deleteMany({});
  await Device.deleteMany({});
  await Log.deleteMany({});

  // Create test user & get token
  await request(app).post('/auth/signup').send({
    name: faker.person.fullName(),
    email: 'testuser@example.com',
    password: 'password123',
  });

  const loginRes = await request(app).post('/auth/login').send({
    email: 'testuser@example.com',
    password: 'password123',
  });

  token = loginRes.body.token;
});

afterAll(async () => {
  await User.deleteMany({});
  await Device.deleteMany({});
  await Log.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth Middleware & Device Routes', () => {
  test('rejects unauthenticated access', async () => {
    const res = await request(app).get('/devices');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/unauthorized/i);
  });

  test('POST /devices registers device', async () => {
    const res = await request(app)
      .post('/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: faker.commerce.productName(),
        type: 'sensor',
        status: 'active',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.device).toHaveProperty('_id');

    deviceId = res.body.device._id;
  });

  test('GET /devices returns devices for user', async () => {
    const res = await request(app)
      .get('/devices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.devices)).toBe(true);
    expect(res.body.devices.length).toBeGreaterThan(0);
  });

  test('POST /devices/:id/heartbeat updates last_active_at', async () => {
    const res = await request(app)
      .post(`/devices/${deviceId}/heartbeat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/heartbeat/i);
    expect(new Date(res.body.last_active_at)).toBeInstanceOf(Date);
  });

  test('POST /devices/:id/logs creates log entry', async () => {
    const logPayload = {
      event: 'units_consumed',
      value: faker.number.int({ min: 1, max: 100 }),
    };
    const res = await request(app)
      .post(`/devices/${deviceId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .send(logPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.log.event).toBe(logPayload.event);
  });

  test('GET /devices/:id/logs fetches logs', async () => {
    const res = await request(app)
      .get(`/devices/${deviceId}/logs`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  test('GET /devices/:id/usage returns aggregated usage', async () => {
    const res = await request(app)
      .get(`/devices/${deviceId}/usage?range=24h`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('total_units_consumed');
  });

  test('error 404 when heartbeat for non-existent device', async () => {
    const res = await request(app)
      .post(`/devices/${new mongoose.Types.ObjectId()}/heartbeat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});
