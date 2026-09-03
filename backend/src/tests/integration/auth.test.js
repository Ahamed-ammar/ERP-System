/**
 * Integration tests — Authentication
 * Tests registration, login, token validation via HTTP (supertest).
 * Uses in-memory MongoDB via setup.js.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { createAdmin } from '../helpers/auth.helpers.js';

// ─── Customer Registration ────────────────────────────────────────────────────

describe('POST /api/auth/customer/register', () => {
  const validPayload = {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'password123',
    name: 'New User',
  };

  it('registers a new customer and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.customer.username).toBe('newuser');
    // Password must never appear in response
    expect(res.body.data.customer.password).toBeUndefined();
  });

  it('rejects duplicate username', async () => {
    await request(app).post('/api/auth/customer/register').send(validPayload);
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ ...validPayload, email: 'other@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/customer/register').send(validPayload);
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ ...validPayload, username: 'otheruser' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing password', async () => {
    const { password, ...noPassword } = validPayload;
    const res = await request(app).post('/api/auth/customer/register').send(noPassword);
    expect(res.status).toBe(400);
  });

  it('rejects short password (< 6 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ ...validPayload, password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ ...validPayload, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects username with special characters', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ ...validPayload, username: 'user name!' });
    expect(res.status).toBe(400);
  });
});

// ─── Customer Login ───────────────────────────────────────────────────────────

describe('POST /api/auth/customer/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/customer/register').send({
      username: 'logintest',
      email: 'logintest@example.com',
      password: 'password123',
      name: 'Login Test',
    });
  });

  it('logs in with correct username and password', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ usernameOrEmail: 'logintest', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.customer.username).toBe('logintest');
    expect(res.body.data.customer.password).toBeUndefined();
  });

  it('logs in with correct email and password', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ usernameOrEmail: 'logintest@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ usernameOrEmail: 'logintest', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent username', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ usernameOrEmail: 'nobody', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ usernameOrEmail: 'logintest' });
    expect(res.status).toBe(400);
  });
});

// ─── Admin Login ──────────────────────────────────────────────────────────────

describe('POST /api/auth/admin/login', () => {
  beforeEach(async () => {
    await createAdmin({ username: 'admlogin', password: 'adminpass123' });
  });

  it('logs in admin with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ username: 'admlogin', password: 'adminpass123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin.role).toBe('admin');
    expect(res.body.data.admin.password).toBeUndefined();
  });

  it('rejects wrong admin password', async () => {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ username: 'admlogin', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('rejects non-existent admin', async () => {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ username: 'nobody', password: 'adminpass123' });

    expect(res.status).toBe(401);
  });
});

// ─── Protected Route — Token Validation ──────────────────────────────────────

describe('Token validation on protected routes', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/customer/profile');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', 'Bearer thisisnotavalidtoken');
    expect(res.status).toBe(401);
  });

  it('returns 401 with expired token', async () => {
    // A real but expired JWT (signed with wrong secret or expired)
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJ1c2VySWQiOiI2MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJyb2xlIjoiY3VzdG9tZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.' +
      'invalidsignature';
    const res = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with Bearer but empty token', async () => {
    const res = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});
