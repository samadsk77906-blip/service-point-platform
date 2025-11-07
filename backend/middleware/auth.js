const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Garage = require('../models/Garage');

// Generate JWT token
const generateToken = (payload, expiresIn = '2h') => { // Reduced from 7d to 2h for better security
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000), // Issued at time
    sessionId: Date.now() + Math.random() // Unique session identifier
  };
  
  return jwt.sign(tokenPayload, process.env.JWT_SECRET || 'service-point-secret-key', {
    expiresIn
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'service-point-secret-key');
    
    // Check if token is expired (additional check for safety)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token has expired');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired. Please log in again.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token format');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    } else {
      throw new Error(error.message || 'Invalid token');
    }
  }
};

// General authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.body.token ||
                  req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.adminToken ||
                  req.body.token ||
                  req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. No token provided.',
        requiresLogin: true
      });
    }

    const decoded = verifyToken(token);
    
    // Verify admin exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or inactive',
        requiresLogin: true
      });
    }

    // Add session info for tracking
    req.admin = {
      id: admin._id,
      adminId: admin.adminId,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      sessionId: decoded.sessionId,
      tokenIssuedAt: decoded.iat
    };
    
    next();
  } catch (error) {
    const isExpiredToken = error.message.includes('expired');
    res.status(401).json({
      success: false,
      message: isExpiredToken ? 'Your admin session has expired. Please log in again.' : 'Invalid admin token',
      error: error.message,
      requiresLogin: true,
      sessionExpired: isExpiredToken
    });
  }
};

// Garage authentication middleware
const authenticateGarage = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.garageToken ||
                  req.body.token ||
                  req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Garage access denied. No token provided.',
        requiresLogin: true
      });
    }

    const decoded = verifyToken(token);
    
    // Verify garage exists and is active
    const garage = await Garage.findById(decoded.id);
    if (!garage || !garage.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Garage not found or inactive',
        requiresLogin: true
      });
    }

    // Add session info for tracking
    req.garage = {
      id: garage._id,
      garageId: garage.garageId,
      garageName: garage.garageName,
      ownerName: garage.ownerName,
      email: garage.email,
      sessionId: decoded.sessionId,
      tokenIssuedAt: decoded.iat
    };
    
    next();
  } catch (error) {
    const isExpiredToken = error.message.includes('expired');
    res.status(401).json({
      success: false,
      message: isExpiredToken ? 'Your session has expired. Please log in again.' : 'Invalid garage token',
      error: error.message,
      requiresLogin: true,
      sessionExpired: isExpiredToken
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin authentication required.'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Main admin only authorization
const authorizeMainAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'main_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Main admin privileges required.'
    });
  }
  next();
};

// Admin or Main Admin authorization
const authorizeAdminOrHigher = (req, res, next) => {
  if (!req.admin || !['admin', 'main_admin'].includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Garage owner can only access their own data
const authorizeGarageOwner = (req, res, next) => {
  if (!req.garage) {
    return res.status(401).json({
      success: false,
      message: 'Garage authentication required'
    });
  }

  // If there's a garageId in params, ensure it matches the authenticated garage
  if (req.params.garageId && req.params.garageId !== req.garage.id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Can only access own garage data.'
    });
  }

  next();
};

// Rate limiting middleware (simple in-memory store)
const rateLimitStore = new Map();

const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, []);
    }

    const requestTimes = rateLimitStore.get(ip);
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);
    rateLimitStore.set(ip, validRequests);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    validRequests.push(now);
    rateLimitStore.set(ip, validRequests);

    next();
  };
};

// Session timeout validation middleware
const validateSessionTimeout = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return next(); // Let the auth middleware handle missing tokens
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'service-point-secret-key');
    
    // Check if token was issued more than 2 hours ago (additional safety check)
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - (decoded.iat || 0);
    const maxTokenAge = 2 * 60 * 60; // 2 hours in seconds
    
    if (tokenAge > maxTokenAge) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired due to inactivity. Please log in again.',
        sessionExpired: true,
        requiresLogin: true
      });
    }
    
    next();
  } catch (error) {
    // If token is invalid, let the main auth middleware handle it
    next();
  }
};

// Cleanup old rate limit entries (run periodically)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [ip, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(time => time > now - oneHour);
    if (validRequests.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, validRequests);
    }
  }
}, 15 * 60 * 1000); // Cleanup every 15 minutes

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authenticateAdmin,
  authenticateGarage,
  authorize,
  authorizeMainAdmin,
  authorizeAdminOrHigher,
  authorizeGarageOwner,
  validateSessionTimeout,
  rateLimit
};
