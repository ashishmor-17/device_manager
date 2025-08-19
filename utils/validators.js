const Joi = require('joi');

exports.signupSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.deviceSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().required(),
  status: Joi.string().valid('active', 'inactive').required()
});

exports.heartbeatSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required()
});

exports.logSchema = Joi.object({
  event: Joi.string().required(),
  value: Joi.number().required()
});
