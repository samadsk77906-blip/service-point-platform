const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { rateLimit } = require('../middleware/auth');

const router = express.Router();

// Apply rate limiting
router.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// @route   GET /api/user/dashboard/:phone
// @desc    Get user dashboard data by phone number
// @access  Public
router.get('/dashboard/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Validate phone number format
    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Find user by phone
    let user = await User.findByPhone(phone);

    // Get bookings for this phone number
    const bookings = await Booking.find({ userPhone: phone })
      .populate('garageId', 'garageName ownerName location services mobile email')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate statistics
    const stats = {
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      pendingBookings: bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length
    };

    // Get recent bookings (last 5)
    const recentBookings = bookings.slice(0, 5).map(booking => ({
      bookingId: booking.bookingId,
      service: booking.service,
      garage: {
        name: booking.garageId?.garageName || 'Unknown Garage',
        owner: booking.garageId?.ownerName,
        location: booking.garageId?.location
      },
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      status: booking.status,
      createdAt: booking.createdAt,
      completedAt: booking.completedAt
    }));

    // Group bookings by status for dashboard
    const bookingsByStatus = {
      pending: bookings.filter(b => b.status === 'pending'),
      confirmed: bookings.filter(b => b.status === 'confirmed'),
      in_progress: bookings.filter(b => b.status === 'in_progress'),
      completed: bookings.filter(b => b.status === 'completed'),
      cancelled: bookings.filter(b => b.status === 'cancelled')
    };

    // Get service usage statistics
    const serviceStats = bookings.reduce((acc, booking) => {
      acc[booking.service] = (acc[booking.service] || 0) + 1;
      return acc;
    }, {});

    const responseData = {
      user: user || {
        phone,
        name: bookings[0]?.userName || null,
        email: bookings[0]?.userEmail || null,
        totalBookings: bookings.length
      },
      stats,
      recentBookings,
      bookingsByStatus: Object.keys(bookingsByStatus).map(status => ({
        status,
        count: bookingsByStatus[status].length,
        bookings: bookingsByStatus[status].slice(0, 3).map(booking => ({
          bookingId: booking.bookingId,
          service: booking.service,
          garage: booking.garageId?.garageName || 'Unknown Garage',
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime
        }))
      })),
      serviceStats: Object.keys(serviceStats).map(service => ({
        service,
        count: serviceStats[service]
      })).sort((a, b) => b.count - a.count)
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user dashboard',
      error: error.message
    });
  }
});

// @route   POST /api/user/profile
// @desc    Create or update user profile
// @access  Public
router.post('/profile', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('phone').matches(/^[0-9]{10,15}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('vehicleDetails').optional().isArray(),
  body('preferredLocation').optional().isObject()
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

    const { name, phone, email, vehicleDetails, preferredLocation } = req.body;

    // Find existing user or create new one
    let user = await User.findByPhone(phone);

    if (user) {
      // Update existing user
      user.name = name;
      if (email) user.email = email;
      if (vehicleDetails) user.vehicleDetails = vehicleDetails;
      if (preferredLocation) user.preferredLocation = preferredLocation;
      user.lastActivity = new Date();
    } else {
      // Create new user
      user = new User({
        name,
        phone,
        email,
        vehicleDetails,
        preferredLocation
      });
    }

    await user.save();

    res.json({
      success: true,
      message: user.isNew ? 'Profile created successfully' : 'Profile updated successfully',
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        vehicleDetails: user.vehicleDetails,
        preferredLocation: user.preferredLocation,
        totalBookings: user.bookingHistory.length
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   GET /api/user/profile/:phone
// @desc    Get user profile by phone
// @access  Public
router.get('/profile/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Validate phone number format
    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const user = await User.findByPhone(phone)
      .populate('bookingHistory', 'bookingId service status scheduledDate createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          phone: user.phone,
          email: user.email,
          vehicleDetails: user.vehicleDetails,
          preferredLocation: user.preferredLocation,
          preferences: user.preferences,
          totalBookings: user.bookingHistory.length,
          lastActivity: user.lastActivity,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

// @route   POST /api/user/vehicle
// @desc    Add vehicle to user profile
// @access  Public
router.post('/vehicle', [
  body('phone').matches(/^[0-9]{10,15}$/),
  body('vehicleData').isObject(),
  body('vehicleData.make').optional().trim().isLength({ min: 1 }),
  body('vehicleData.model').optional().trim().isLength({ min: 1 }),
  body('vehicleData.year').optional().isInt({ min: 1900, max: 2030 }),
  body('vehicleData.licensePlate').optional().trim().isLength({ min: 1 }),
  body('vehicleData.color').optional().trim().isLength({ min: 1 })
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

    const { phone, vehicleData } = req.body;

    let user = await User.findByPhone(phone);
    
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        name: 'User', // Placeholder name
        phone,
        vehicleDetails: [vehicleData]
      });
    } else {
      await user.addVehicle(vehicleData);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Vehicle added successfully',
      vehicleDetails: user.vehicleDetails
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding vehicle',
      error: error.message
    });
  }
});

// @route   PUT /api/user/vehicle/default
// @desc    Set default vehicle
// @access  Public
router.put('/vehicle/default', [
  body('phone').matches(/^[0-9]{10,15}$/),
  body('vehicleIndex').isInt({ min: 0 })
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

    const { phone, vehicleIndex } = req.body;

    const user = await User.findByPhone(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.setDefaultVehicle(vehicleIndex);

    res.json({
      success: true,
      message: 'Default vehicle updated successfully',
      vehicleDetails: user.vehicleDetails
    });

  } catch (error) {
    console.error('Set default vehicle error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating default vehicle',
      error: error.message
    });
  }
});

// @route   DELETE /api/user/vehicle/:phone/:vehicleIndex
// @desc    Remove vehicle from user profile
// @access  Public
router.delete('/vehicle/:phone/:vehicleIndex', async (req, res) => {
  try {
    const { phone, vehicleIndex } = req.params;

    // Validate phone number format
    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const user = await User.findByPhone(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.removeVehicle(parseInt(vehicleIndex));

    res.json({
      success: true,
      message: 'Vehicle removed successfully',
      vehicleDetails: user.vehicleDetails
    });

  } catch (error) {
    console.error('Remove vehicle error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing vehicle',
      error: error.message
    });
  }
});

// @route   PUT /api/user/preferences
// @desc    Update user preferences
// @access  Public
router.put('/preferences', [
  body('phone').matches(/^[0-9]{10,15}$/),
  body('preferences').isObject(),
  body('preferences.notifications').optional().isObject(),
  body('preferences.preferredServices').optional().isArray(),
  body('preferences.maxDistance').optional().isInt({ min: 1, max: 100 })
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

    const { phone, preferences } = req.body;

    const user = await User.findByPhone(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    Object.keys(preferences).forEach(key => {
      user.preferences[key] = preferences[key];
    });

    user.lastActivity = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message
    });
  }
});

module.exports = router;
