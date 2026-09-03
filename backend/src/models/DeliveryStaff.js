import mongoose from 'mongoose';

const deliveryStaffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^\d{10}$/.test(v);
        },
        message: 'Phone number must be 10 digits'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// NOTE: unique:true on phone already creates an index. No duplicate needed.

const DeliveryStaff = mongoose.model('DeliveryStaff', deliveryStaffSchema);

export default DeliveryStaff;
