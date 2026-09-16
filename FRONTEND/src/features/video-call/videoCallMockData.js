/**
 * SupportDesk Video Call Feature — Isolated Mock Data & Local State Models
 */

export const initialVideoCallState = {
  callId: 'call_9901',
  ticketId: '#1018',
  ticketSubject: 'Application crashes on startup',
  agent: {
    name: 'Alex Johnson',
    role: 'Support Agent',
    initials: 'AJ',
    avatarBg: '#0A84FF',
    isMuted: false,
    isCameraOff: false,
  },
  customer: {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@company.com',
    role: 'Customer (Acme Corp)',
    initials: 'RS',
    avatarBg: '#30D158',
    isMuted: false,
    isCameraOff: false,
  },
  status: 'idle', // 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'
  isScreenSharing: false,
  isChatOpen: false,
  durationSeconds: 872, // 14 mins 32 secs default
  inCallMessages: [
    {
      id: 'icm_1',
      sender: 'agent',
      senderName: 'Alex Johnson',
      time: '11:35 AM',
      text: 'Hi Rahul! Can you reproduce the application crash now while sharing your screen?',
    },
    {
      id: 'icm_2',
      sender: 'customer',
      senderName: 'Rahul Sharma',
      time: '11:36 AM',
      text: 'Yes Alex, launching the app right now. I will click the diagnostic log button.',
    },
  ],
};
