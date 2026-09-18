import User from '../../models/User.js';

/**
 * Service: Get Current User Profile
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};
