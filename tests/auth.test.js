const request = require('supertest');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const app = require('../server');
const User = require('../models/User');

let userData;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  }
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth Routes', () => {
  beforeEach(() => {
    userData = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
  });

  test('POST /auth/signup - success', async () => {
    const res = await request(app).post('/auth/signup').send(userData);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /auth/signup - fail on duplicate email', async () => {
    await request(app).post('/auth/signup').send(userData);
    const res = await request(app).post('/auth/signup').send(userData);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /auth/login - success', async () => {
    await request(app).post('/auth/signup').send(userData);

    const res = await request(app).post('/auth/login').send({
      email: userData.email,
      password: userData.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /auth/login - fail invalid password', async () => {
    await request(app).post('/auth/signup').send(userData);

    const res = await request(app).post('/auth/login').send({
      email: userData.email,
      password: 'wrongpassword',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
