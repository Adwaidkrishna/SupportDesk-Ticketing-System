import User from '../../../models/User.js';

/**
 * Service to update an agent's availability status.
 *
 * @param {string} agentId - Target agent's MongoDB ObjectId
 * @param {'Available'|'Busy'|'Away'|'Offline'} status - New availability status
 * @returns {Promise<Object>} Updated safe agent object
 */
export const updateAgentStatus = async (agentId, status) => {
  const agent = await User.findOne({ _id: agentId, role: 'agent' });

  if (!agent) {
    const error = new Error('Agent not found.');
    error.statusCode = 404;
    throw error;
  }

  agent.availability = status;
  await agent.save();

  return {
    id: agent._id.toString(),
    _id: agent._id.toString(),
    name: agent.name,
    email: agent.email,
    department: agent.department || 'General Support',
    role: agent.role,
    status: agent.availability,
    availability: agent.availability,
    isActive: agent.isActive !== false,
    updatedAt: agent.updatedAt,
  };
};

export default updateAgentStatus;
