const { faker } = require('@faker-js/faker');
const {
  signupSchema,
  loginSchema,
  deviceSchema,
  heartbeatSchema,
  logSchema
} = require('../utils/validators');

describe('Validation Schemas', () => {
  test('signupSchema validates correct data', () => {
    const data = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(10),
      role: 'user',
    };
    const { error } = signupSchema.validate(data);
    expect(error).toBeUndefined();
  });

  test('signupSchema rejects invalid email', () => {
    const data = {
      name: faker.person.fullName(),
      email: 'not-an-email',
      password: faker.internet.password(10),
    };
    const { error } = signupSchema.validate(data);
    expect(error).toBeDefined();
  });

  test('loginSchema validates correct data', () => {
    const data = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
    const { error } = loginSchema.validate(data);
    expect(error).toBeUndefined();
  });

  test('deviceSchema validates correct data', () => {
    const data = {
      name: faker.commerce.productName(),
      type: faker.helpers.arrayElement(['light', 'temperature', 'thermostat']),
      status: faker.helpers.arrayElement(['active', 'inactive']),
    };
    const { error } = deviceSchema.validate(data);
    expect(error).toBeUndefined();
  });

  test('heartbeatSchema validates status', () => {
    const data = {
      status: 'active',
    };
    const { error } = heartbeatSchema.validate(data);
    expect(error).toBeUndefined();
  });

  test('logSchema validates correct data', () => {
    const data = {
      event: faker.hacker.noun(),
      value: faker.number.int({ min: 0, max: 100 }),
    };
    const { error } = logSchema.validate(data);
    expect(error).toBeUndefined();
  });

  test('logSchema rejects missing value', () => {
    const data = {
      event: faker.hacker.noun(),
    };
    const { error } = logSchema.validate(data);
    expect(error).toBeDefined();
  });
});
