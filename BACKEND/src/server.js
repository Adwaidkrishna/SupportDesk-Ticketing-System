import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import connectDB from './config/db.js';
import initializeSocket from './socket/socket.js';

import { seedDefaultPolicies } from './services/sla/sla.service.js';
import { startSlaMonitor } from './jobs/slaMonitor.job.js';
import { registerShutdownHandlers } from './utils/gracefulShutdown.js';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = initializeSocket(httpServer);

// Register graceful shutdown handlers for SIGTERM and SIGINT
registerShutdownHandlers({ httpServer, io });

connectDB().then(() => {
  //sla need to run continuesly
  seedDefaultPolicies().catch((err) => console.warn('[SLA] Failed to seed default policies:', err.message));
  startSlaMonitor(60000);

  httpServer.listen(PORT, () => {
    console.log(
      `\n🚀 [SupportDesk API] Server running in ${process.env.NODE_ENV || 'development'
      } mode on port ${PORT}`
    );

    console.log(`👉 Auth API: http://localhost:${PORT}/api/v1/auth`);
    console.log(`🔌 Socket.IO: http://localhost:${PORT}\n`);
  });
});
