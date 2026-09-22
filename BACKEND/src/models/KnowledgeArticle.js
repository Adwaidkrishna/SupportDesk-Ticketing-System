import mongoose from 'mongoose';

export const KB_CATEGORIES = [
  'Getting Started',
  'Account & Security',
  'Billing & Plans',
  'Troubleshooting',
  'API & Integrations',
  'General',
];

export const KB_STATUSES = ['DRAFT', 'PUBLISHED'];

const KnowledgeArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Article category is required'],
      enum: {
        values: KB_CATEGORIES,
        message: '{VALUE} is not a valid knowledge base category',
      },
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
      trim: true,
      maxlength: [25000, 'Content must not exceed 25,000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: KB_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'DRAFT',
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for search
KnowledgeArticleSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('KnowledgeArticle', KnowledgeArticleSchema);
