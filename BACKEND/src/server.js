require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 [SupportDesk API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`👉 Auth API: http://localhost:${PORT}/api/v1/auth\n`);
  });
});
