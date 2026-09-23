import mongoose from 'mongoose';

const SlaPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      index: true,
    },
    responseTimeMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    resolutionTimeMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    warningPercentage: {
      type: Number,
      default: 80,
      min: 1,
      max: 99,
    },
    businessHours: {
      type: String,
      default: '24/7 Coverage',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('SlaPolicy', SlaPolicySchema);
