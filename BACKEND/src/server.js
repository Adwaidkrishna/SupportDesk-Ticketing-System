import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import connectDB from './config/db.js';
import initializeSocket from './socket/socket.js';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

initializeSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(
      `\n🚀 [SupportDesk API] Server running in ${
        process.env.NODE_ENV || 'development'
      } mode on port ${PORT}`
    );

    console.log(`👉 Auth API: http://localhost:${PORT}/api/v1/auth`);
    console.log(`🔌 Socket.IO: http://localhost:${PORT}\n`);
  });
});
