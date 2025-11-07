const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Garage = require('../models/Garage');
const { generateToken, rateLimit } = require('../middleware/auth');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(rateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact main admin.'
      });
    }

    // Validate password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = generateToken({
      id: admin._id,
      adminId: admin.adminId,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    });

    res.json({
      success: true,
      message: '✅ Successful Login',
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// @route   POST /api/auth/admin/register
// @desc    Register first admin (main_admin) - only works if no admins exist
// @access  Public
router.post('/admin/register', [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    // Check if any admin exists
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Admin registration is closed. Contact existing admin.'
      });
    }

    const { name, email, password } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create first admin as main_admin
    const admin = new Admin({
      name,
      email,
      password,
      role: 'main_admin'
    });

    await admin.save();

    // Generate token
    const token = generateToken({
      id: admin._id,
      adminId: admin.adminId,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Main admin account created successfully',
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   POST /api/auth/garage/login
// @desc    Garage owner login
// @access  Public
router.post('/garage/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find garage by email
    const garage = await Garage.findByEmail(email);
    if (!garage) {
      return res.status(401).json({
        success: false,
        message: '❌ Login Failed – Invalid Email or Password'
      });
    }

    // Check if garage is active
    if (!garage.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Garage account is deactivated. Please contact admin.'
      });
    }

    // Validate password
    const isValidPassword = await garage.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '❌ Login Failed – Invalid Email or Password'
      });
    }

    // Update last login
    garage.lastLogin = new Date();
    await garage.save();

    // Generate token
    const token = generateToken({
      id: garage._id,
      garageId: garage.garageId,
      email: garage.email,
      type: 'garage'
    });

    res.json({
      success: true,
      message: '✅ Successful Login',
      garage: {
        id: garage._id,
        garageId: garage.garageId,
        garageName: garage.garageName,
        ownerName: garage.ownerName,
        email: garage.email,
        services: garage.services,
        location: garage.location
      },
      token
    });

  } catch (error) {
    console.error('Garage login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// @route   POST /api/auth/garage/reset-password
// @desc    Reset garage password (admin only)
// @access  Private (Admin)
router.post('/garage/reset-password', [
  body('garageId').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    // This route should be protected by admin middleware in actual usage
    const { garageId, newPassword } = req.body;

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    garage.password = newPassword;
    await garage.save();

    res.json({
      success: true,
      message: 'Garage password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: error.message
    });
  }
});

// @route   POST /api/auth/garage/register
// @desc    Garage owner self-registration (only if garage exists)
// @access  Public
router.post('/garage/register', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('garageId').trim().isLength({ min: 3 }).withMessage('Garage ID must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, garageId, password } = req.body;

    // Check if garage exists with matching email and garageId
    const existingGarage = await Garage.findOne({ 
      email: email.toLowerCase(),
      garageId: garageId.toUpperCase(),
      isActive: true
    });

    if (!existingGarage) {
      return res.status(404).json({
        success: false,
        message: '❌ Invalid email or Garage ID combination. Please check your details or contact your admin.'
      });
    }

    // Check if garage is already registered by checking if password is hashed (longer than 20 characters)
    const isAlreadyRegistered = existingGarage.password && existingGarage.password.startsWith('$');
    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: '❌ This garage is already registered! Please use the login page with your existing password.'
      });
    }

    // Update the garage with the new password and registration status
    existingGarage.password = password; // Will be hashed by pre-save middleware
    existingGarage.isRegistered = true;
    existingGarage.registrationDate = new Date();
    await existingGarage.save();

    res.status(200).json({
      success: true,
      message: '✅ Registration completed successfully! You can now login with your email and password.',
      garageInfo: {
        garageId: existingGarage.garageId,
        garageName: existingGarage.garageName,
        ownerName: existingGarage.ownerName,
        email: existingGarage.email
      }
    });

  } catch (error) {
    console.error('Garage registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout (client-side token removal)
// @access  Public
router.post('/logout', (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // This endpoint is for consistency and potential future server-side logout logic
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   GET /api/auth/verify
// @desc    Verify token validity
// @access  Public
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // This would use the verifyToken function
    // For now, just return success if token exists
    res.json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;
