/**
 * Integration tests — Products
 * Covers: public access, admin CRUD, routing correctness, validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { registerCustomer, createAdmin } from '../helpers/auth.helpers.js';
import { createProduct } from '../helpers/seed.helpers.js';

// ─── Public Product Endpoints ─────────────────────────────────────────────────

describe('GET /api/products — public product list', () => {
  beforeEach(async () => {
    await createProduct({ name: 'Active Product', isActive: true });
    await createProduct({ name: 'Inactive Product', isActive: false });
  });

  it('returns only active products (no auth required)', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.products.map(p => p.name);
    expect(names).toContain('Active Product');
    expect(names).not.toContain('Inactive Product');
  });

  it('does not expose password or sensitive fields', async () => {
    const res = await request(app).get('/api/products');
    res.body.data.products.forEach(p => {
      expect(p.password).toBeUndefined();
    });
  });
});

describe('GET /api/products/:id — public product detail', () => {
  it('returns product by valid ID', async () => {
    const product = await createProduct({ name: 'Detail Product' });
    const res = await request(app).get(`/api/products/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.product.name).toBe('Detail Product');
  });

  it('returns 400 for invalid ObjectId', async () => {
    const res = await request(app).get('/api/products/not-a-valid-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for valid ObjectId that does not exist', async () => {
    const res = await request(app).get('/api/products/64a1b2c3d4e5f6a7b8c9d0e1');
    expect(res.status).toBe(404);
  });
});

// ─── Admin Product Routes ─────────────────────────────────────────────────────

describe('GET /api/products/admin/all — admin product list', () => {
  beforeEach(async () => {
    await createProduct({ name: 'Admin Active', isActive: true });
    await createProduct({ name: 'Admin Inactive', isActive: false });
  });

  it('returns all products including inactive for admin', async () => {
    const { token } = await createAdmin({ username: 'prodadmin', password: 'adminpass' });
    const res = await request(app)
      .get('/api/products/admin/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const names = res.body.data.products.map(p => p.name);
    expect(names).toContain('Admin Active');
    expect(names).toContain('Admin Inactive');
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/products/admin/all');
    expect(res.status).toBe(401);
  });

  it('returns 403 for customer accessing admin endpoint', async () => {
    const { token } = await registerCustomer({ username: 'prodcust', email: 'prodcust@example.com' });
    const res = await request(app)
      .get('/api/products/admin/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── Admin Create Product ─────────────────────────────────────────────────────

describe('POST /api/products — admin create product', () => {
  let adminToken;

  beforeEach(async () => {
    const { token } = await createAdmin({ username: 'createadmin', password: 'adminpass' });
    adminToken = token;
  });

  it('creates a product with valid data', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'New Rice Flour')
      .field('rawMaterialPricePerKg', '50')
      .field('grindingChargePerKg', '15');

    expect(res.status).toBe(201);
    expect(res.body.data.product.name).toBe('New Rice Flour');
    expect(res.body.data.product.rawMaterialPricePerKg).toBe(50);
  });

  it('rejects duplicate product name', async () => {
    await createProduct({ name: 'Duplicate Product' });
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Duplicate Product')
      .field('rawMaterialPricePerKg', '50')
      .field('grindingChargePerKg', '15');

    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Incomplete Product');
    // missing rawMaterialPricePerKg and grindingChargePerKg

    expect(res.status).toBe(400);
  });

  it('rejects negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Negative Price')
      .field('rawMaterialPricePerKg', '-10')
      .field('grindingChargePerKg', '15');

    expect(res.status).toBe(400);
  });

  it('customer cannot create product', async () => {
    const { token } = await registerCustomer({ username: 'prodblockcust', email: 'prodblockcust@example.com' });
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Unauthorized Product')
      .field('rawMaterialPricePerKg', '50')
      .field('grindingChargePerKg', '15');

    expect(res.status).toBe(403);
  });
});

// ─── Admin Toggle Product Status ──────────────────────────────────────────────

describe('PATCH /api/products/:id/toggle — admin toggle product status', () => {
  it('toggles product active status', async () => {
    const { token } = await createAdmin({ username: 'toggleadmin', password: 'adminpass' });
    const product = await createProduct({ name: 'Toggle Product', isActive: true });

    const res = await request(app)
      .patch(`/api/products/${product._id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.product.isActive).toBe(false);
  });
});
