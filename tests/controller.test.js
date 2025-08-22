const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { generateTokens } = require('../middlewares/auth');
const { setJSON, getJSON, delByPattern } = require('../middlewares/cache');
const User = require('../models/User');
const Device = require('../models/Device');
const Log = require('../models/Log');
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require('uuid');

jest.mock('../models/User');
jest.mock('../models/Device');
jest.mock('../models/Log');
jest.mock('bcrypt');
jest.mock('../middlewares/auth');
jest.mock('../middlewares/cache');
jest.mock('uuid');

jest.mock('json2csv', () => ({
  Parser: jest.fn(),
}));

const authController = require('../controllers/authController');
const deviceController = require('../controllers/deviceController');

const { Types: { ObjectId } } = mongoose;

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: {},
      app: { get: jest.fn() },
    };
    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
      set: jest.fn(),
      attachment: jest.fn(() => res),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('fails if user exists', async () => {
      User.findOne.mockResolvedValue(true);
      req.body = { email: 'test@example.com', password: 'pw', name: 'Name', role: 'user' };

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User exists' });
    });

    it('creates new user and caches profile', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedpw');
      const createdUser = { _id: 'id123', name: 'Name', email: 'email@example.com', role: 'user' };
      User.create.mockResolvedValue(createdUser);
      setJSON.mockResolvedValue();

      req.body = { name: 'Name', email: 'EMAIL@example.com', password: 'pw', role: 'user' };

      await authController.signup(req, res);

      expect(User.create).toHaveBeenCalledWith({
        name: 'Name',
        email: 'email@example.com',
        password: 'hashedpw',
        role: 'user',
      });
      expect(setJSON).toHaveBeenCalledWith(expect.stringContaining('user:'), expect.any(Number), expect.objectContaining({
        id: createdUser._id,
        email: 'email@example.com',
        role: 'user',
      }));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'User registered successfully' });
    });

    it('handles errors', async () => {
      User.findOne.mockRejectedValue(new Error('fail'));
      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
    });
  });

  describe('login', () => {
    it('fails if user not found', async () => {
      User.findOne.mockResolvedValue(null);
      req.body = { email: 'test@example.com', password: 'pw' };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
    });

    it('fails if password mismatch', async () => {
      User.findOne.mockResolvedValue({ password: 'hashed' });
      bcrypt.compare.mockResolvedValue(false);
      req.body = { email: 'test@example.com', password: 'wrong' };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
    });

    it('returns tokens and caches user', async () => {
      const user = { _id: 'id1', password: 'hashed', name: 'Name', email: 'email@example.com', role: 'user' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      generateTokens.mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' });
      setJSON.mockResolvedValue();

      req.body = { email: 'EMAIL@example.com', password: 'pw' };

      await authController.login(req, res);

      expect(generateTokens).toHaveBeenCalledWith(expect.objectContaining({
        id: user._id,
        role: 'user',
        email: 'email@example.com',
      }));
      expect(setJSON).toHaveBeenCalledWith(expect.any(String), expect.any(Number), expect.objectContaining({
        id: user._id,
        email: 'email@example.com',
        role: 'user',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        user: expect.objectContaining({ id: user._id, email: 'email@example.com' }),
        accessToken: 'access',
        refreshToken: 'refresh',
      }));
    });

    it('handles errors', async () => {
      User.findOne.mockRejectedValue(new Error('fail'));
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
    });
  });
});

describe('Device Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: {},
      app: { get: jest.fn() },
    };
    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
      set: jest.fn(),
      attachment: jest.fn(() => res),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('creates device and invalidates cache', async () => {
      req.user.id = 'user1';
      req.body = { name: 'dev', type: 'sensor', status: 'active' };
      Device.create.mockResolvedValue({ _id: 'device1', name: 'dev' });
      delByPattern.mockResolvedValue();

      await deviceController.registerDevice(req, res);

      expect(Device.create).toHaveBeenCalledWith({
        name: 'dev',
        type: 'sensor',
        status: 'active',
        owner_id: 'user1',
      });
      expect(delByPattern).toHaveBeenCalledWith('devices:user1:*');
      expect(res.json).toHaveBeenCalledWith({ success: true, device: { _id: 'device1', name: 'dev' } });
    });

    it('handles errors', async () => {
      Device.create.mockRejectedValue(new Error('fail'));
      req.user.id = 'user1';
      req.body = {};

      await deviceController.registerDevice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
    });
  });

  describe('getDevices', () => {
    it('returns cached devices', async () => {
      req.user.id = 'user1';
      req.query = { type: 'sensor' };
      getJSON.mockResolvedValue({ success: true, devices: ['cached'] });

      await deviceController.getDevices(req, res);

      expect(getJSON).toHaveBeenCalledWith('devices:user1:{"type":"sensor"}');
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.json).toHaveBeenCalledWith({ success: true, devices: ['cached'] });
    });

    it('fetches devices and caches', async () => {
      req.user.id = 'user1';
      req.query = { type: 'sensor', status: 'active' };
      getJSON.mockResolvedValue(null);
      Device.find.mockResolvedValue(['device1']);
      setJSON.mockResolvedValue();

      await deviceController.getDevices(req, res);

      expect(Device.find).toHaveBeenCalledWith({ owner_id: 'user1', type: 'sensor', status: 'active' });
      expect(setJSON).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS-STORE');
      expect(res.json).toHaveBeenCalledWith({ success: true, devices: ['device1'] });
    });

    it('handles errors', async () => {
      Device.find.mockRejectedValue(new Error('fail'));
      req.user.id = 'user1';

      await deviceController.getDevices(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
    });
  });

  describe('heartbeat', () => {
    it('returns 400 if invalid device ID', async () => {
      req.user.id = 'user1';
      req.params.id = 'invalidid'; // invalid ObjectId
      req.body.status = 'active';

      await deviceController.heartbeat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid device ID' });
    });

    it('updates device, clears caches, emits event', async () => {
      req.user.id = 'user1';
      req.params.id = '507f1f77bcf86cd799439011'; // valid ObjectId string
      req.body.status = 'active';
      const device = {
        _id: new ObjectId(req.params.id),
        status: 'active',
        last_active_at: new Date(),
      };
      Device.findOneAndUpdate.mockResolvedValue(device);
      delByPattern.mockResolvedValue();
      const emit = jest.fn();
      req.app.get.mockReturnValue({ emit });

      await deviceController.heartbeat(req, res);

      expect(Device.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: req.params.id, owner_id: 'user1' },
        expect.objectContaining({ status: 'active' }),
        { new: true }
      );
      expect(delByPattern).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith('device-heartbeat', expect.objectContaining({
        deviceId: device._id,
        status: 'active',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('handles errors', async () => {
      Device.findOneAndUpdate.mockRejectedValue(new Error('fail'));
      req.user.id = 'user1';
      req.params.id = '507f1f77bcf86cd799439011';

      await deviceController.heartbeat(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
    });
  });
});
