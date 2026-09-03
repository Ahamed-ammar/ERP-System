/**
 * Auth helpers for tests
 * Provides functions to register/login customers and admins,
 * returning Bearer tokens for use in authenticated requests.
 */

import request from 'supertest';
import app from '../../app.js';
import Admin from '../../models/Admin.js';
import bcrypt from 'bcryptjs';

/**
 * Register a customer and return the token.
 * @param {object} overrides — partial customer fields
 */
export const registerCustomer = async (overrides = {}) => {
  const defaults = {
    username: 'testcustomer',
    email: 'test@example.com',
    password: 'password123',
    name: 'Test Customer',
  };
  const body = { ...defaults, ...overrides };

  const res = await request(app).post('/api/auth/customer/register').send(body);
  if (res.status !== 201) {
    throw new Error(`registerCustomer failed: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, user: res.body.data.customer };
};

/**
 * Login a customer and return the token.
 */
export const loginCustomer = async (usernameOrEmail = 'testcustomer', password = 'password123') => {
  const res = await request(app)
    .post('/api/auth/customer/login')
    .send({ usernameOrEmail, password });
  if (res.status !== 200) {
    throw new Error(`loginCustomer failed: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, user: res.body.data.customer };
};

/**
 * Create an admin directly in the DB (bypass registration endpoint which doesn't exist).
 * Returns a token via login.
 */
export const createAdmin = async (overrides = {}) => {
  const defaults = { username: 'testadmin', password: 'adminpass123' };
  const opts = { ...defaults, ...overrides };

  const admin = new Admin({
    username: opts.username,
    password: opts.password, // pre-save hook will hash it
  });
  await admin.save();

  const res = await request(app)
    .post('/api/auth/admin/login')
    .send({ username: opts.username, password: opts.password });
  if (res.status !== 200) {
    throw new Error(`createAdmin login failed: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, admin: res.body.data.admin };
};
