import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      unique: true,
      trim: true
    },
    rawMaterialPricePerKg: {
      type: Number,
      required: [true, 'Raw material price per kg is required'],
      min: [0, 'Raw material price cannot be negative']
    },
    grindingChargePerKg: {
      type: Number,
      required: [true, 'Grinding charge per kg is required'],
      min: [0, 'Grinding charge cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// NOTE: unique:true on name already creates an index.
// Keep isActive index for filtering active products.
productSchema.index({ isActive: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
