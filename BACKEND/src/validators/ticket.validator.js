import mongoose from 'mongoose';

export const SUPPORTED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const validateCreateTicketInput = (req, res, next) => {
  const { subject, description, categoryId, priority } = req.body;

  // 1. Validate Subject
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject is required.',
    });
  }

  const trimmedSubject = subject.trim();
  if (trimmedSubject.length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject must be at least 5 characters long.',
    });
  }

  if (trimmedSubject.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject must not exceed 200 characters.',
    });
  }

  // 2. Validate Description
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description is required.',
    });
  }

  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description must be at least 10 characters long.',
    });
  }

  if (trimmedDescription.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description must not exceed 5000 characters.',
    });
  }

  // 3. Validate Category ID
  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category ID is required.',
    });
  }

  const trimmedCategoryId = categoryId.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmedCategoryId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid Category ID format.',
    });
  }

  // 4. Validate Priority if provided
  if (priority !== undefined && priority !== null && priority !== '') {
    if (typeof priority !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Priority must be a string.',
      });
    }
    const normalizedPriority = priority.trim().toUpperCase();
    if (!SUPPORTED_PRIORITIES.includes(normalizedPriority)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Priority must be one of [${SUPPORTED_PRIORITIES.join(', ')}].`,
      });
    }
  }

  // Attach normalized fields to req for downstream usage if helpful
  req.validatedData = {
    subject: trimmedSubject,
    description: trimmedDescription,
    categoryId: trimmedCategoryId,
    priority: priority ? priority.trim().toUpperCase() : 'MEDIUM',
  };

  next();
};
