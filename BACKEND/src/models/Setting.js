import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'system_settings',
    },
    general: {
      companyName: {
        type: String,
        default: 'SupportDesk Global Systems',
      },
      supportEmail: {
        type: String,
        default: 'support@supportdesk.com',
      },
      timezone: {
        type: String,
        default: 'UTC +05:30 (Asia/Kolkata)',
      },
      defaultLanguage: {
        type: String,
        default: 'English (US)',
      },
    },
    ticketSettings: {
      allowCustomerReopen: {
        type: Boolean,
        default: true,
      },
      requireCategory: {
        type: Boolean,
        default: true,
      },
      allowAttachments: {
        type: Boolean,
        default: true,
      },
      autoCloseResolvedDays: {
        type: Number,
        default: 3,
      },
      defaultPriority: {
        type: String,
        default: 'Medium',
      },
    },
    notifications: {
      newTicketAlert: {
        type: Boolean,
        default: true,
      },
      assignmentAlert: {
        type: Boolean,
        default: true,
      },
      customerReplyAlert: {
        type: Boolean,
        default: true,
      },
      slaWarningAlert: {
        type: Boolean,
        default: true,
      },
      slaBreachAlert: {
        type: Boolean,
        default: true,
      },
      escalationAlert: {
        type: Boolean,
        default: true,
      },
      dailyReportEmail: {
        type: Boolean,
        default: true,
      },
    },
    security: {
      sessionTimeoutMins: {
        type: Number,
        default: 30,
      },
      passwordPolicy: {
        type: String,
        default: 'Strong (Min 8 chars, numbers, symbols)',
      },
      twoFactorAuth: {
        type: String,
        default: 'Optional',
      },
      loginAlerts: {
        type: Boolean,
        default: true,
      },
    },
    appearance: {
      theme: {
        type: String,
        default: 'Dark Navy (Default)',
      },
      compactMode: {
        type: Boolean,
        default: false,
      },
      sidebarBehavior: {
        type: String,
        default: 'Expanded',
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', SettingSchema);
