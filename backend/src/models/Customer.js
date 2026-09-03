import mongoose from 'mongoose';
import { USER_ROLES, STREET_TYPES } from '../config/constants.js';

const customerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include password in queries by default
    },
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^\d{10}$/.test(v);
        },
        message: 'Phone number must be 10 digits'
      }
    },
    streetType: {
      type: String,
      enum: Object.values(STREET_TYPES),
      trim: true
    },
    houseName: {
      type: String,
      trim: true
    },
    doorNo: {
      type: String,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      default: USER_ROLES.CUSTOMER,
      immutable: true
    }
  },
  {
    timestamps: true
  }
);

// NOTE: unique:true on username, email, phone already creates indexes.
// No duplicate index() calls needed here.

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
