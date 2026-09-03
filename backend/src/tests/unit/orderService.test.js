/**
 * Unit tests for orderService.js
 * Tests pure business logic: price calculation, status transitions, snapshots.
 * No database required.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateItemTotal,
  calculateOrderTotal,
  createPriceSnapshot,
  isValidStatusTransition,
} from '../../services/orderService.js';
import { ORDER_TYPES, VALID_STATUS_TRANSITIONS, ORDER_STATUS } from '../../config/constants.js';

// ─── calculateItemTotal ───────────────────────────────────────────────────────

describe('calculateItemTotal', () => {
  const item = {
    quantity: 2,
    rawMaterialPriceSnapshot: 40,
    grindingChargeSnapshot: 10,
  };

  it('serviceOnly: charges only grinding', () => {
    const total = calculateItemTotal(item, ORDER_TYPES.SERVICE_ONLY);
    expect(total).toBe(20); // 2 × 10
  });

  it('buyAndService: charges raw material + grinding', () => {
    const total = calculateItemTotal(item, ORDER_TYPES.BUY_AND_SERVICE);
    expect(total).toBe(100); // 2 × (40 + 10)
  });

  it('unknown orderType: returns 0', () => {
    const total = calculateItemTotal(item, 'unknownType');
    expect(total).toBe(0);
  });

  it('handles fractional kg (0.5 kg)', () => {
    const halfKg = { quantity: 0.5, rawMaterialPriceSnapshot: 100, grindingChargeSnapshot: 20 };
    expect(calculateItemTotal(halfKg, ORDER_TYPES.BUY_AND_SERVICE)).toBe(60); // 0.5 × 120
    expect(calculateItemTotal(halfKg, ORDER_TYPES.SERVICE_ONLY)).toBe(10);    // 0.5 × 20
  });
});

// ─── calculateOrderTotal ─────────────────────────────────────────────────────

describe('calculateOrderTotal', () => {
  it('sums all item totals', () => {
    const items = [
      { itemTotal: 100 },
      { itemTotal: 50 },
      { itemTotal: 25 },
    ];
    expect(calculateOrderTotal(items)).toBe(175);
  });

  it('handles single item', () => {
    expect(calculateOrderTotal([{ itemTotal: 42 }])).toBe(42);
  });

  it('handles empty array', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

// ─── createPriceSnapshot ─────────────────────────────────────────────────────

describe('createPriceSnapshot', () => {
  it('copies product prices into snapshot fields', () => {
    const product = { rawMaterialPricePerKg: 80, grindingChargePerKg: 15 };
    const snap = createPriceSnapshot(product);
    expect(snap.rawMaterialPriceSnapshot).toBe(80);
    expect(snap.grindingChargeSnapshot).toBe(15);
  });

  it('snapshot is independent — mutating product does not change snapshot', () => {
    const product = { rawMaterialPricePerKg: 80, grindingChargePerKg: 15 };
    const snap = createPriceSnapshot(product);
    product.rawMaterialPricePerKg = 999;
    expect(snap.rawMaterialPriceSnapshot).toBe(80); // unchanged
  });
});

// ─── isValidStatusTransition ─────────────────────────────────────────────────

describe('isValidStatusTransition', () => {
  const T = VALID_STATUS_TRANSITIONS;

  it('Pending → InProgress is valid', () => {
    expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS, T)).toBe(true);
  });

  it('Pending → Cancelled is valid', () => {
    expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED, T)).toBe(true);
  });

  it('InProgress → Ready is valid', () => {
    expect(isValidStatusTransition(ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY, T)).toBe(true);
  });

  it('Ready → OutForDelivery is valid', () => {
    expect(isValidStatusTransition(ORDER_STATUS.READY, ORDER_STATUS.OUT_FOR_DELIVERY, T)).toBe(true);
  });

  it('OutForDelivery → Delivered is valid', () => {
    expect(isValidStatusTransition(ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED, T)).toBe(true);
  });

  it('Pending → Delivered is INVALID (skip states)', () => {
    expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.DELIVERED, T)).toBe(false);
  });

  it('Delivered → Cancelled is INVALID (terminal state)', () => {
    expect(isValidStatusTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, T)).toBe(false);
  });

  it('Cancelled → any is INVALID (terminal state)', () => {
    expect(isValidStatusTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.PENDING, T)).toBe(false);
    expect(isValidStatusTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED, T)).toBe(false);
  });

  it('Delivered → any is INVALID (terminal state)', () => {
    expect(isValidStatusTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.IN_PROGRESS, T)).toBe(false);
  });

  it('same status → same is INVALID', () => {
    expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PENDING, T)).toBe(false);
  });
});
