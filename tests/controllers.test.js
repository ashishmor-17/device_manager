const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { signup, login } = require('../controllers/authController');
const deviceController = require('../controllers/deviceController');
const User = require('../models/User');
const Device = require('../models/Device');
const Log = require('../models/Log');

// Ensure test secret is set
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

// Utility: Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Utility: Mock request object
const mockRequest = (body = {}, params = {}, query = {}, user = {}) => ({
  body,
  params,
  query,
  user,
});

// Mock DB models
jest.mock('../models/User');
jest.mock('../models/Device');
jest.mock('../models/Log');

describe('Auth Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('signup', () => {
    it('should register user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({});
      const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'pass123', role: 'user' });
      const res = mockResponse();

      await signup(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'User registered successfully' });
    });

    it('should return 400 if user exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });
      const req = mockRequest({ email: 'test@example.com' });
      const res = mockResponse();

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User exists' });
    });
  });

  describe('login', () => {
    it('should login successfully and return token', async () => {
      const hashedPass = await bcrypt.hash('pass123', 10);
      User.findOne.mockResolvedValue({
        _id: '123',
        email: 'test@example.com',
        password: hashedPass,
        role: 'user',
        name: 'Test'
      });

      const req = mockRequest({ email: 'test@example.com', password: 'pass123' });
      const res = mockResponse();

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({ id: '123', email: 'test@example.com' }),
      }));
    });

    it('should return 401 if user not found', async () => {
      User.findOne.mockResolvedValue(null);
      const req = mockRequest({ email: 'notfound@example.com', password: 'pass123' });
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
    });

    it('should return 401 if password does not match', async () => {
      const hashedPass = await bcrypt.hash('otherpass', 10);
      User.findOne.mockResolvedValue({ password: hashedPass });

      const req = mockRequest({ email: 'test@example.com', password: 'wrongpass' });
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
    });
  });
});

describe('Device Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('registerDevice', () => {
    it('should create device successfully', async () => {
      Device.create.mockResolvedValue({
        id: 'dev1',
        name: 'Light',
        type: 'light',
        status: 'active',
        owner_id: 'user1'
      });

      const req = mockRequest(
        { name: 'Light', type: 'light', status: 'active' },
        {},
        {},
        { id: 'user1' }
      );
      const res = mockResponse();

      await deviceController.registerDevice(req, res);

      expect(Device.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, device: expect.any(Object) }));
    });

    it('should return 500 on error', async () => {
      Device.create.mockRejectedValue(new Error('fail'));
      const req = mockRequest({ name: 'Light' }, {}, {}, { id: 'user1' });
      const res = mockResponse();

      await deviceController.registerDevice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat successfully', async () => {
      Device.findOneAndUpdate.mockResolvedValue({ last_active_at: new Date() });

      const validId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ status: 'active' }, { id: validId }, {}, { id: 'user1' });
      const res = mockResponse();

      await deviceController.heartbeat(req, res);

      expect(Device.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for invalid id', async () => {
      const req = mockRequest({ status: 'active' }, { id: 'invalidid' }, {}, { id: 'user1' });
      const res = mockResponse();

      await deviceController.heartbeat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 404 if device not found', async () => {
      Device.findOneAndUpdate.mockResolvedValue(null);

      const validId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ status: 'active' }, { id: validId }, {}, { id: 'user1' });
      const res = mockResponse();

      await deviceController.heartbeat(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});
