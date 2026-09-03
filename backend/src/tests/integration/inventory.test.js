/**
 * Integration tests — Phase 1: Inventory Management
 *
 * Covers:
 *  - Stock check blocks buyAndService orders when stock is insufficient
 *  - serviceOnly orders are NOT blocked by stock (customer brings their own material)
 *  - Stock is deducted from product after a buyAndService order is created
 *  - Stock is NOT deducted for serviceOnly items
 *  - Stock is restored when an order is cancelled
 *  - Partial cancel: only buyAndService items restore stock
 *  - Admin can set and update stock level
 *  - Admin can fetch low-stock products
 *  - Stock update validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import Product from '../../models/Product.js';
import { registerCustomer, createAdmin } from '../helpers/auth.helpers.js';
import { createProduct } from '../helpers/seed.helpers.js';
import { GRIND_TYPES, ORDER_TYPES } from '../../config/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const address = {
  name: 'Test User',
  phone: '9876543210',
  streetType: 'Center',
  houseName: 'Test House',
  doorNo: '12',
  landmark: 'Near park',
};

const makeOrderPayload = (productId, quantity, orderType) => ({
  items: [{ productId, quantity, grindType: GRIND_TYPES.FINE, orderType }],
  deliveryAddress: address,
});

// ─── Stock check on order creation ───────────────────────────────────────────

describe('Stock check — order creation', () => {
  let customerToken;

  beforeEach(async () => {
    const { token } = await registerCustomer({
      username: 'stockcust',
      email: 'stockcust@example.com',
    });
    customerToken = token;
  });

  it('allows buyAndService order when stock is sufficient', async () => {
    const product = await createProduct({ name: 'Stocked Wheat', stockKg: 50 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 5, ORDER_TYPES.BUY_AND_SERVICE));

    expect(res.status).toBe(201);
  });

  it('rejects buyAndService order when stock is insufficient', async () => {
    const product = await createProduct({ name: 'Low Wheat', stockKg: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 5, ORDER_TYPES.BUY_AND_SERVICE));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.message).toContain('Low Wheat');
  });

  it('rejects buyAndService order when stock is exactly zero', async () => {
    const product = await createProduct({ name: 'Zero Wheat', stockKg: 0 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 1, ORDER_TYPES.BUY_AND_SERVICE));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('allows serviceOnly order even when product stockKg is zero', async () => {
    // serviceOnly = customer brings their own material, mill stock is irrelevant
    const product = await createProduct({ name: 'ServiceOnly Wheat', stockKg: 0 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 5, ORDER_TYPES.SERVICE_ONLY));

    expect(res.status).toBe(201);
  });

  it('allows order for exact stock amount (boundary)', async () => {
    const product = await createProduct({ name: 'Exact Wheat', stockKg: 5 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 5, ORDER_TYPES.BUY_AND_SERVICE));

    expect(res.status).toBe(201);
  });
});

// ─── Stock deduction on order creation ───────────────────────────────────────

describe('Stock deduction — buyAndService order', () => {
  let customerToken;

  beforeEach(async () => {
    const { token } = await registerCustomer({
      username: 'deductcust',
      email: 'deductcust@example.com',
    });
    customerToken = token;
  });

  it('deducts stockKg by ordered quantity after buyAndService order', async () => {
    const product = await createProduct({ name: 'Deduct Wheat', stockKg: 50 });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 8, ORDER_TYPES.BUY_AND_SERVICE));

    const updated = await Product.findById(product._id);
    expect(updated.stockKg).toBe(42); // 50 - 8
  });

  it('does NOT deduct stock for serviceOnly item', async () => {
    const product = await createProduct({ name: 'Service Wheat', stockKg: 50 });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 10, ORDER_TYPES.SERVICE_ONLY));

    const updated = await Product.findById(product._id);
    expect(updated.stockKg).toBe(50); // unchanged
  });

  it('deducts only buyAndService items in a mixed order', async () => {
    const p1 = await createProduct({ name: 'Mix Wheat', stockKg: 100 });
    const p2 = await createProduct({ name: 'Mix Rice', stockKg: 100 });

    const mixedPayload = {
      items: [
        { productId: p1._id.toString(), quantity: 4, grindType: GRIND_TYPES.FINE, orderType: ORDER_TYPES.BUY_AND_SERVICE },
        { productId: p2._id.toString(), quantity: 6, grindType: GRIND_TYPES.MEDIUM, orderType: ORDER_TYPES.SERVICE_ONLY },
      ],
      deliveryAddress: address,
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(mixedPayload);

    expect(res.status).toBe(201);

    const [updP1, updP2] = await Promise.all([
      Product.findById(p1._id),
      Product.findById(p2._id),
    ]);

    expect(updP1.stockKg).toBe(96);  // deducted: 100 - 4
    expect(updP2.stockKg).toBe(100); // unchanged: serviceOnly
  });
});

// ─── Stock restoration on cancellation ───────────────────────────────────────

describe('Stock restoration — order cancellation', () => {
  let customerToken;

  beforeEach(async () => {
    const { token } = await registerCustomer({
      username: 'restorecust',
      email: 'restorecust@example.com',
    });
    customerToken = token;
  });

  it('restores stockKg when a buyAndService order is cancelled', async () => {
    const product = await createProduct({ name: 'Restore Wheat', stockKg: 50 });

    // Place order (deducts 10 kg)
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 10, ORDER_TYPES.BUY_AND_SERVICE));

    expect(orderRes.status).toBe(201);
    const afterOrder = await Product.findById(product._id);
    expect(afterOrder.stockKg).toBe(40); // 50 - 10

    // Cancel order (should restore 10 kg)
    const cancelRes = await request(app)
      .put(`/api/customer/orders/${orderRes.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelRes.status).toBe(200);
    const afterCancel = await Product.findById(product._id);
    expect(afterCancel.stockKg).toBe(50); // restored
  });

  it('does NOT restore stock for serviceOnly items on cancellation', async () => {
    const product = await createProduct({ name: 'No Restore Wheat', stockKg: 50 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(makeOrderPayload(product._id.toString(), 10, ORDER_TYPES.SERVICE_ONLY));

    expect(orderRes.status).toBe(201);

    await request(app)
      .put(`/api/customer/orders/${orderRes.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    const afterCancel = await Product.findById(product._id);
    expect(afterCancel.stockKg).toBe(50); // still unchanged
  });
});

// ─── Admin stock management ───────────────────────────────────────────────────

describe('PATCH /api/products/:id/stock — admin stock update', () => {
  let adminToken;

  beforeEach(async () => {
    const { token } = await createAdmin({ username: 'stockadmin', password: 'adminpass' });
    adminToken = token;
  });

  it('admin can set product stock', async () => {
    const product = await createProduct({ name: 'Admin Stock Wheat', stockKg: 10 });

    const res = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stockKg: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.stockKg).toBe(200);
  });

  it('admin can update low-stock threshold', async () => {
    const product = await createProduct({ name: 'Threshold Wheat', stockKg: 50, lowStockThresholdKg: 10 });

    const res = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stockKg: 50, lowStockThresholdKg: 25 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.lowStockThresholdKg).toBe(25);
  });

  it('rejects negative stock value', async () => {
    const product = await createProduct({ name: 'Negative Wheat', stockKg: 50 });

    const res = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stockKg: -10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing stockKg field', async () => {
    const product = await createProduct({ name: 'Missing Stock Wheat', stockKg: 50 });

    const res = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('customer cannot update stock', async () => {
    const { token } = await registerCustomer({
      username: 'stockblk',
      email: 'stockblk@example.com',
    });
    const product = await createProduct({ name: 'Block Stock Wheat' });

    const res = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stockKg: 100 });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent product', async () => {
    const res = await request(app)
      .patch('/api/products/64a1b2c3d4e5f6a7b8c9d0e1/stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stockKg: 100 });

    expect(res.status).toBe(404);
  });
});

// ─── Low-stock endpoint ───────────────────────────────────────────────────────

describe('GET /api/products/admin/low-stock', () => {
  let adminToken;

  beforeEach(async () => {
    const { token } = await createAdmin({ username: 'lowstockadmin', password: 'adminpass' });
    adminToken = token;
  });

  it('returns products below their threshold', async () => {
    await createProduct({ name: 'Critical Wheat',  stockKg: 2,  lowStockThresholdKg: 10, isActive: true });
    await createProduct({ name: 'Fine Wheat',      stockKg: 50, lowStockThresholdKg: 10, isActive: true });
    await createProduct({ name: 'Critical Ragi',   stockKg: 0,  lowStockThresholdKg: 5,  isActive: true });

    const res = await request(app)
      .get('/api/products/admin/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.products.map(p => p.name);
    expect(names).toContain('Critical Wheat');
    expect(names).toContain('Critical Ragi');
    expect(names).not.toContain('Fine Wheat');
  });

  it('returns empty array when no products are low on stock', async () => {
    await createProduct({ name: 'Healthy Wheat', stockKg: 100, lowStockThresholdKg: 10 });

    const res = await request(app)
      .get('/api/products/admin/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });

  it('does not include inactive products in low-stock list', async () => {
    await createProduct({ name: 'Inactive Critical', stockKg: 0, lowStockThresholdKg: 10, isActive: false });

    const res = await request(app)
      .get('/api/products/admin/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.products.map(p => p.name);
    expect(names).not.toContain('Inactive Critical');
  });

  it('returns products sorted by stockKg ascending (most critical first)', async () => {
    await createProduct({ name: 'Almost Gone',  stockKg: 1, lowStockThresholdKg: 10 });
    await createProduct({ name: 'Getting Low',  stockKg: 7, lowStockThresholdKg: 10 });
    await createProduct({ name: 'Very Critical', stockKg: 0, lowStockThresholdKg: 10 });

    const res = await request(app)
      .get('/api/products/admin/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const stocks = res.body.data.products.map(p => p.stockKg);
    // Should be ascending
    for (let i = 0; i < stocks.length - 1; i++) {
      expect(stocks[i]).toBeLessThanOrEqual(stocks[i + 1]);
    }
  });

  it('customer cannot access low-stock endpoint', async () => {
    const { token } = await registerCustomer({ username: 'lowstockcust', email: 'lowstockcust@example.com' });

    const res = await request(app)
      .get('/api/products/admin/low-stock')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/products/admin/low-stock');
    expect(res.status).toBe(401);
  });
});
