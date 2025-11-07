const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');

// Import routes
const authRoutes = require('../../backend/routes/auth');
const adminRoutes = require('../../backend/routes/admin');
const garageRoutes = require('../../backend/routes/garage');
const bookingRoutes = require('../../backend/routes/booking');
const userRoutes = require('../../backend/routes/user');
const locationRoutes = require('../../backend/routes/location');
const emailRoutes = require('../../backend/routes/email');

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration for production
app.use(cors({
  origin: [
    'https://your-netlify-site.netlify.app', // Replace with your actual Netlify URL
    'http://localhost:3001', // For local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database connection with caching for serverless
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Optimizations for serverless
      bufferCommands: false,
      bufferMaxEntries: 0,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    console.log('✅ MongoDB Connected Successfully (Serverless)');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw error;
  }
};

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/garage', garageRoutes);
app.use('/booking', bookingRoutes);
app.use('/user', userRoutes);
app.use('/location', locationRoutes);
app.use('/email', emailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Service Point API is running on Netlify Functions',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    success: false, 
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Serverless function handler
exports.handler = async (event, context) => {
  // Ensure database connection
  try {
    await connectDB();
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: 'Database connection failed' 
      })
    };
  }

  // Create serverless handler
  const handler = serverless(app);
  return handler(event, context);
};