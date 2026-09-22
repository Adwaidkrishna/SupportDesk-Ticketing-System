import User from '../../models/User.js';

/**
 * Service to activate or deactivate a user account.
 *
 * @param {string} userId - Target user's MongoDB ObjectId
 * @param {boolean} isActive - New activation state
 * @returns {Promise<Object>} Updated safe user object
 */
export const updateUserStatus = async (userId, isActive) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  user.isActive = Boolean(isActive);
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

export default updateUserStatus;
