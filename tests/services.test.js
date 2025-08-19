const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Log = require('../models/Log');
const { generateToken } = require('../services/tokenService');
const { calculateUsage } = require('../services/usageService');

jest.mock('../models/Log');

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret123';
});


describe('AuthService - generateToken', () => {
  const user = {
    _id: '507f191e810c19729de860ea',
    role: 'user',
  };

  it('should generate a valid JWT token with correct payload and options', () => {
    const token = generateToken(user);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', user._id);
    expect(decoded).toHaveProperty('role', user.role);
    expect(decoded).toHaveProperty('iss', 'smart-device-manager');
    expect(decoded).toHaveProperty('exp');
  });
});

describe('DeviceService - calculateUsage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return total units consumed from aggregation', async () => {
    const deviceId = new mongoose.Types.ObjectId();
    const mockTotal = 42;

    Log.aggregate.mockResolvedValue([
      { _id: deviceId, total: mockTotal }
    ]);

    const usage = await calculateUsage(deviceId, 24);
    expect(usage).toBe(mockTotal);

    expect(Log.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          device_id: deviceId,
          event: 'units_consumed',
          timestamp: expect.any(Object)
        }
      },
      {
        $group: {
          _id: '$device_id',
          total: { $sum: '$value' }
        }
      }
    ]);
  });

  it('should return 0 if no logs found', async () => {
    Log.aggregate.mockResolvedValue([]);

    const usage = await calculateUsage(new mongoose.Types.ObjectId(), 24);
    expect(usage).toBe(0);
  });
});
