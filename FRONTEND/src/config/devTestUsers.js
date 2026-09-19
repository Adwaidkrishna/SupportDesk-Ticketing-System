/**
 * Development test accounts for quick login convenience during local testing.
 * Only utilized when import.meta.env.DEV is true.
 */
const devTestUsers = [
  {
    label: 'Customer',
    role: 'customer',
    email: 'supportdesk.customer@test.local',
    password: 'TestCustomer@12345',
  },
  {
    label: 'Agent',
    role: 'agent',
    email: 'supportdesk.agent@test.local',
    password: 'TestAgent@12345',
  },
  {
    label: 'Admin',
    role: 'admin',
    email: 'supportdesk.admin@test.local',
    password: 'TestAdmin@12345',
  },
];

export default devTestUsers;
