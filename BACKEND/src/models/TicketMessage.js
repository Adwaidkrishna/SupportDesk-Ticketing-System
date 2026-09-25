import mongoose from 'mongoose';

const TicketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['customer', 'agent', 'admin'],
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

// High-frequency query index: ticket message retrieval sorted chronologically
TicketMessageSchema.index({ ticketId: 1, createdAt: 1 });

export default mongoose.model('TicketMessage', TicketMessageSchema);

