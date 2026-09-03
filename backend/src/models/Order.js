import mongoose from 'mongoose';
import {
  ORDER_TYPES,
  ORDER_STATUS,
  GRIND_TYPES,
  STREET_TYPES,
  DELIVERY_TYPES
} from '../config/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.1, 'Quantity must be at least 0.1 kg']
    },
    grindType: {
      type: String,
      required: true,
      enum: Object.values(GRIND_TYPES)
    },
    orderType: {
      type: String,
      required: true,
      enum: Object.values(ORDER_TYPES)
    },
    rawMaterialPriceSnapshot: {
      type: Number,
      required: true,
      min: 0
    },
    grindingChargeSnapshot: {
      type: Number,
      required: true,
      min: 0
    },
    itemTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    streetType: {
      type: String,
      required: true,
      enum: Object.values(STREET_TYPES)
    },
    houseName: {
      type: String,
      required: true,
      trim: true
    },
    doorNo: {
      type: String,
      required: true,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    orderType: {
      type: String,
      enum: Object.values(ORDER_TYPES),
      required: false // Made optional since we now use per-item order types
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Order must have at least one item'
      }
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true
    },
    deliveryType: {
      type: String,
      enum: Object.values(DELIVERY_TYPES),
      default: DELIVERY_TYPES.DELIVERY
    },
    deliveryStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryStaff'
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING
    },
    estimatedReadyDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
// Compound indexes for common query patterns
orderSchema.index({ customerId: 1, createdAt: -1 }); // Customer order history sorted by date
orderSchema.index({ createdAt: -1, status: 1 });     // Analytics: date-range + status filter

const Order = mongoose.model('Order', orderSchema);

export default Order;
