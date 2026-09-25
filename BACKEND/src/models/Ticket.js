import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    sla: {
      policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SlaPolicy',
        default: null,
      },
      policyName: {
        type: String,
        default: null,
      },
      priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      },
      responseTimeMinutes: {
        type: Number,
        default: null,
      },
      resolutionTimeMinutes: {
        type: Number,
        default: null,
      },
      warningPercentage: {
        type: Number,
        default: 80,
      },
      responseDeadline: {
        type: Date,
        default: null,
        index: true,
      },
      resolutionDeadline: {
        type: Date,
        default: null,
        index: true,
      },
      firstResponseAt: {
        type: Date,
        default: null,
      },
      responseBreached: {
        type: Boolean,
        default: false,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
      resolutionBreached: {
        type: Boolean,
        default: false,
      },
      isBreached: {
        type: Boolean,
        default: false,
        index: true,
      },
      warningNotified: {
        type: Boolean,
        default: false,
      },
      breachNotified: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// High-frequency query index: SLA monitoring query for active tickets by status and deadline
TicketSchema.index({ status: 1, 'sla.responseDeadline': 1 });

export default mongoose.model('Ticket', TicketSchema);

