require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const whatifRoutes = require('./routes/whatif');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(cors({
  origin: true, // Allow all origins in dev, or specify frontend origin
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/whatif', whatifRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'express-server' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Express Backend Server running on port ${PORT}`);
});
