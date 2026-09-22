import User from '../../models/User.js';

/**
 * Service to edit a user's details (name, email, role, phone, department, isActive).
 *
 * @param {string} userId - Target user's MongoDB ObjectId
 * @param {Object} updateData - Validated updates
 * @returns {Promise<Object>} Updated safe user object
 */
export const updateUserDetails = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check email uniqueness if email is changed
  if (updateData.email && updateData.email !== user.email) {
    const existing = await User.findOne({
      email: updateData.email,
      _id: { $ne: userId },
    });
    if (existing) {
      const error = new Error('A user with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }
    user.email = updateData.email;
  }

  if (updateData.name !== undefined) user.name = updateData.name;
  if (updateData.role !== undefined) user.role = updateData.role;
  if (updateData.phone !== undefined) user.phone = updateData.phone;
  if (updateData.department !== undefined) user.department = updateData.department;
  if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

  await user.save();

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    status: user.isActive ? 'Active' : 'Inactive',
    phone: user.phone || '',
    department: user.department || 'General Support',
    isVerified: Boolean(user.isVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export default updateUserDetails;
