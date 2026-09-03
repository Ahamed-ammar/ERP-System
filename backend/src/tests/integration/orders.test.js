/**
 * Integration tests — Orders
 * Covers: creation, status transitions, IDOR protection, historical pricing,
 * cancellation rules, and authorization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import { registerCustomer, createAdmin } from '../helpers/auth.helpers.js';
import { createProduct, createOrder, createCustomer, createDeliveryStaff } from '../helpers/seed.helpers.js';
import { ORDER_STATUS, GRIND_TYPES, ORDER_TYPES } from '../../config/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const orderPayload = (productId, overrides = {}) => ({
  items: [
    {
      productId,
      quantity: 2,
      grindType: GRIND_TYPES.FINE,
      orderType: ORDER_TYPES.BUY_AND_SERVICE,
    },
  ],
  deliveryAddress: {
    name: 'Test User',
    phone: '9876543210',
    streetType: 'Center',
    houseName: 'Test House',
    doorNo: '12',
    landmark: 'Near park',
  },
  ...overrides,
});

// ─── Order Creation ───────────────────────────────────────────────────────────

describe('POST /api/orders — Order creation', () => {
  let customerToken, product;

  beforeEach(async () => {
    const { token } = await registerCustomer({ username: 'ordercust', email: 'ordercust@example.com' });
    customerToken = token;
    product = await createProduct({ rawMaterialPricePerKg: 40, grindingChargePerKg: 10 });
  });

  it('creates an order and returns 201', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(product._id.toString()));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
  });

  it('calculates total server-side (ignores any frontend price)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(product._id.toString()));

    // 2 kg × (40 + 10) = 100
    expect(res.body.data.totalAmount).toBe(100);
  });

  it('serviceOnly: charges grinding only', async () => {
    const payload = orderPayload(product._id.toString());
    payload.items[0].orderType = ORDER_TYPES.SERVICE_ONLY;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    // 2 kg × 10 = 20
    expect(res.body.data.totalAmount).toBe(20);
  });

  it('rejects order with inactive product', async () => {
    const inactive = await createProduct({ name: 'Inactive Product', isActive: false });
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(inactive._id.toString()));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PRODUCT_INACTIVE');
  });

  it('rejects order with non-existent product ID', async () => {
    const fakeId = '64a1b2c3d4e5f6a7b8c9d0e1';
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(fakeId));

    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(orderPayload(product._id.toString()));

    expect(res.status).toBe(401);
  });
});

// ─── Historical Price Immutability (critical invariant) ───────────────────────

describe('Historical price immutability', () => {
  it('order total does not change when product price changes after order creation', async () => {
    const { token } = await registerCustomer({ username: 'histcust', email: 'histcust@example.com' });
    const product = await createProduct({ rawMaterialPricePerKg: 40, grindingChargePerKg: 10 });

    // Create the order
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(product._id.toString()));

    expect(res.status).toBe(201);
    const originalTotal = res.body.data.totalAmount; // 100

    // Admin updates the product price
    const { token: adminToken } = await createAdmin({ username: 'histadmin', password: 'adminpass' });
    await request(app)
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rawMaterialPricePerKg: 999, grindingChargePerKg: 999 });

    // Re-fetch the original order
    const orderId = res.body.data.orderId;
    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(orderRes.status).toBe(200);
    expect(orderRes.body.data.totalAmount).toBe(originalTotal); // still 100, not 2×(999+999)

    // Verify snapshot values
    const item = orderRes.body.data.items[0];
    expect(item.rawMaterialPriceSnapshot).toBe(40);
    expect(item.grindingChargeSnapshot).toBe(10);
  });
});

// ─── Order Status Transitions ─────────────────────────────────────────────────

describe('Order status transitions (Admin)', () => {
  let adminToken, customer, product, order;

  beforeEach(async () => {
    const { token } = await createAdmin({ username: 'statusadmin', password: 'adminpass' });
    adminToken = token;
    customer = await createCustomer({ username: 'statuscust', email: 'statuscust@example.com' });
    product = await createProduct({ name: 'Status Test Product' });
    order = await createOrder(customer._id, product);
  });

  it('Pending → InProgress is allowed', async () => {
    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.IN_PROGRESS });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ORDER_STATUS.IN_PROGRESS);
  });

  it('Pending → Delivered is REJECTED (skip states)', async () => {
    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.DELIVERED });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('full lifecycle: Pending → InProgress → Ready → OutForDelivery → Delivered', async () => {
    const steps = [
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.READY,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
    ];
    for (const step of steps) {
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: step });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(step);
    }
  });

  it('Delivered → Cancelled is REJECTED (terminal)', async () => {
    // Advance to Delivered
    const steps = [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED];
    for (const step of steps) {
      await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: step });
    }

    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.CANCELLED });

    expect(res.status).toBe(422);
  });

  it('customer cannot update order status', async () => {
    const { token } = await registerCustomer({ username: 'statusblock', email: 'statusblock@example.com' });
    const res = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ORDER_STATUS.IN_PROGRESS });

    expect(res.status).toBe(403);
  });
});

// ─── Order Cancellation ───────────────────────────────────────────────────────

describe('Order cancellation (Customer)', () => {
  let customerToken, customerId, product;

  beforeEach(async () => {
    const { token, user } = await registerCustomer({ username: 'cancelcust', email: 'cancelcust@example.com' });
    customerToken = token;
    customerId = user.id;
    product = await createProduct({ name: 'Cancel Test Product' });
  });

  it('customer can cancel a Pending order', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(product._id.toString()));
    expect(createRes.status).toBe(201);

    const res = await request(app)
      .put(`/api/customer/orders/${createRes.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ORDER_STATUS.CANCELLED);
  });

  it('customer cannot cancel an InProgress order', async () => {
    const { token: adminToken } = await createAdmin({ username: 'canceladmin', password: 'adminpass' });
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload(product._id.toString()));

    // Advance to InProgress
    await request(app)
      .put(`/api/orders/${createRes.body.data.orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.IN_PROGRESS });

    const res = await request(app)
      .put(`/api/customer/orders/${createRes.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANNOT_CANCEL_ORDER');
  });
});

// ─── IDOR Protection ─────────────────────────────────────────────────────────

describe('IDOR protection — Customer order isolation', () => {
  it('customer A cannot view customer B order', async () => {
    const { token: tokenA } = await registerCustomer({ username: 'custA', email: 'custA@example.com' });
    const { token: tokenB } = await registerCustomer({ username: 'custB', email: 'custB@example.com' });

    const product = await createProduct({ name: 'IDOR Test Product' });

    // Customer B creates an order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(orderPayload(product._id.toString()));
    expect(orderRes.status).toBe(201);

    // Customer A tries to fetch Customer B's order
    const res = await request(app)
      .get(`/api/orders/${orderRes.body.data.orderId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
  });

  it('customer A cannot cancel customer B order', async () => {
    const { token: tokenA } = await registerCustomer({ username: 'custA2', email: 'custA2@example.com' });
    const { token: tokenB } = await registerCustomer({ username: 'custB2', email: 'custB2@example.com' });

    const product = await createProduct({ name: 'IDOR Cancel Product' });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(orderPayload(product._id.toString()));
    expect(orderRes.status).toBe(201);

    const res = await request(app)
      .put(`/api/customer/orders/${orderRes.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
  });
});

// ─── Authorization on Order Endpoints ────────────────────────────────────────

describe('Authorization', () => {
  it('unauthenticated request to GET /api/orders returns 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('customer cannot access admin GET /api/orders', async () => {
    const { token } = await registerCustomer({ username: 'authblock', email: 'authblock@example.com' });
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
