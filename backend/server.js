const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds timeout
  res.setTimeout(30000);
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database connection with retry logic
const connectDB = async (retryCount = 0) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/service-point', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (Attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < 3) {
      console.log(`🔄 Retrying connection in 5 seconds...`);
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      console.error('❌ Failed to connect to MongoDB after 3 attempts');
      console.log('⚠️  Server will continue running for email testing and frontend access');
      console.log('📝 To fix: Install MongoDB Community Server from https://www.mongodb.com/try/download/community');
    }
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/garage', require('./routes/garage'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/user', require('./routes/user'));
app.use('/api/location', require('./routes/location'));
app.use('/api/email', require('./routes/email'));

// Static files - serve frontend (AFTER API routes)
app.use(express.static(path.join(__dirname, '../frontend')));

// 404 handler for API routes (BEFORE catch-all)
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Serve frontend for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
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

// Start server
const startServer = async () => {
  try {
    // Try to connect to MongoDB but don't fail if it doesn't work
    await connectDB();
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, but server will continue...');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`📧 Email Test: http://localhost:${PORT}/email-test.html`);
    
    if (!mongoose.connection.readyState) {
      console.log('');
      console.log('⚠️  MongoDB not connected! Some features will be limited.');
      console.log('📝 To install MongoDB: https://www.mongodb.com/try/download/community');
      console.log('✨ You can still test email functionality!');
    }
  });
};

startServer();

module.exports = app;
