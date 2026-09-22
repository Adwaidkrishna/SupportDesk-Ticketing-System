import User from '../../models/User.js';

/**
 * Service to edit an agent's details (name, email, department, role, status).
 *
 * @param {string} agentId - Target agent's MongoDB ObjectId
 * @param {Object} updateData - Validated updates
 * @returns {Promise<Object>} Updated safe agent object
 */
export const updateAgentDetails = async (agentId, updateData) => {
  const agent = await User.findOne({ _id: agentId, role: 'agent' });

  if (!agent) {
    const error = new Error('Agent not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check email uniqueness if email is changed
  if (updateData.email && updateData.email !== agent.email) {
    const existing = await User.findOne({
      email: updateData.email,
      _id: { $ne: agentId },
    });
    if (existing) {
      const error = new Error('A user with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }
    agent.email = updateData.email;
  }

  if (updateData.name !== undefined) agent.name = updateData.name;
  if (updateData.department !== undefined) agent.department = updateData.department;
  if (updateData.role !== undefined) agent.role = updateData.role;
  if (updateData.status !== undefined) agent.availability = updateData.status;

  await agent.save();

  return {
    id: agent._id.toString(),
    _id: agent._id.toString(),
    name: agent.name,
    email: agent.email,
    department: agent.department || 'General Support',
    role: agent.role,
    status: agent.availability || 'Available',
    availability: agent.availability || 'Available',
    isActive: agent.isActive !== false,
    updatedAt: agent.updatedAt,
  };
};

export default updateAgentDetails;
