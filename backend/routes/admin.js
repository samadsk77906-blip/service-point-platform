const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Garage = require('../models/Garage');
const Booking = require('../models/Booking');
const { authenticateAdmin, authorizeMainAdmin, authorizeAdminOrHigher, validateSessionTimeout } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// All admin routes require authentication
// First validate session timeout, then authenticate
router.use(validateSessionTimeout);
router.use(authenticateAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin)
router.get('/dashboard', async (req, res) => {
  try {
    const stats = {
      totalGarages: await Garage.countDocuments({ isActive: true }),
      totalBookings: await Booking.countDocuments(),
      pendingBookings: await Booking.countDocuments({ status: 'pending' }),
      completedBookings: await Booking.countDocuments({ status: 'completed' }),
      totalAdmins: await Admin.countDocuments({ isActive: true }),
      recentBookings: await Booking.find()
        .populate('garageId', 'garageName ownerName location')
        .sort({ createdAt: -1 })
        .limit(10),
      activeGarages: await Garage.find({ isActive: true })
        .select('garageName ownerName location services createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// @route   POST /api/admin/garage
// @desc    Add new garage
// @access  Private (Admin)
router.post('/garage', [
  body('garageName').trim().isLength({ min: 2 }).withMessage('Garage name must be at least 2 characters'),
  body('ownerName').trim().isLength({ min: 2 }).withMessage('Owner name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('contactNumber').matches(/^[0-9+\-\s\(\)]{10,18}$/).withMessage('Contact number must be 10-18 characters with digits, spaces, +, -, () allowed'),
  body('location').trim().isLength({ min: 5 }).withMessage('Location must be at least 5 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('garageId').optional().trim().isLength({ min: 3 }).withMessage('Garage ID must be at least 3 characters')
], async (req, res) => {
  try {
    console.log('Received garage data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { garageName, ownerName, email, contactNumber, location, latitude, longitude, garageId } = req.body;

    // Check if email already exists
    const existingGarage = await Garage.findByEmail(email);
    if (existingGarage) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if custom garageId is provided and unique
    if (garageId) {
      const existingGarageId = await Garage.findByGarageId(garageId);
      if (existingGarageId) {
        return res.status(400).json({
          success: false,
          message: 'Garage ID already exists'
        });
      }
    }

    // Parse location for hierarchy (simple implementation)
    // For now, we'll use default values since the schema requires them
    // You can enhance this to parse the location string properly
    const locationParts = location.split(',').map(part => part.trim());
    
    // Create new garage
    const garage = new Garage({
      garageName,
      ownerName,
      email,
      contactNumber,
      location,
      locationHierarchy: {
        country: 'India', // Default country
        state: locationParts[locationParts.length - 1] || 'Unknown State',
        city: locationParts[locationParts.length - 2] || 'Unknown City', 
        district: locationParts[locationParts.length - 3] || 'Unknown District'
      },
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      garageId: garageId || undefined, // Use provided garageId or let schema generate one
      createdBy: req.admin.id
    });

    await garage.save();

    // Send email notification to garage owner
    try {
      await sendGarageCredentials(garage);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Garage added successfully',
      garage: garage
    });

  } catch (error) {
    console.error('Add garage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding garage',
      error: error.message
    });
  }
});

// @route   GET /api/admin/garages
// @desc    Get all garages with filters
// @access  Private (Admin)
router.get('/garages', async (req, res) => {
  try {
    const { 
      search, 
      country, 
      state, 
      city, 
      district, 
      service,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { garageName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { garageId: { $regex: search, $options: 'i' } }
      ];
    }

    if (country) query['location.country'] = { $regex: country, $options: 'i' };
    if (state) query['location.state'] = { $regex: state, $options: 'i' };
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (district) query['location.district'] = { $regex: district, $options: 'i' };
    if (service) query.services = { $in: [service] };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const garages = await Garage.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    const totalGarages = await Garage.countDocuments(query);
    const totalPages = Math.ceil(totalGarages / parseInt(limit));

    res.json({
      success: true,
      data: {
        garages,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalGarages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get garages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garages',
      error: error.message
    });
  }
});

// @route   GET /api/admin/garage/:id
// @desc    Get single garage
// @access  Private (Admin)
router.get('/garage/:id', async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    res.json({
      success: true,
      data: garage
    });

  } catch (error) {
    console.error('Get garage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/garage/:id
// @desc    Update garage
// @access  Private (Admin)
router.put('/garage/:id', [
  body('garageName').optional().trim().isLength({ min: 2 }),
  body('ownerName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('contactNumber').optional().matches(/^[0-9+\-\s\(\)]{10,18}$/),
  body('location').optional().trim().isLength({ min: 5 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('services').optional().isArray({ min: 1 })
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

    const garage = await Garage.findById(req.params.id);
    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    const updates = req.body;
    const oldEmail = garage.email;

    // Check if email is being changed and if it already exists
    if (updates.email && updates.email !== oldEmail) {
      const existingGarage = await Garage.findOne({ 
        email: updates.email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingGarage) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Update garage
    Object.keys(updates).forEach(key => {
      if (key === 'latitude' || key === 'longitude') {
        // Handle coordinates specially
        if (!garage.coordinates) garage.coordinates = {};
        garage.coordinates[key] = parseFloat(updates[key]);
      } else {
        garage[key] = updates[key];
      }
    });

    await garage.save();

    // Send email notification if email was changed
    if (updates.email && updates.email !== oldEmail) {
      try {
        await sendEmailUpdateNotification(garage, oldEmail);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Continue even if email fails
      }
    }

    res.json({
      success: true,
      message: 'Garage updated successfully',
      garage: garage
    });

  } catch (error) {
    console.error('Update garage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating garage',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/garage/:id
// @desc    Remove garage
// @access  Private (Admin)
router.delete('/garage/:id', async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id);
    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    // Soft delete by setting isActive to false
    garage.isActive = false;
    await garage.save();

    res.json({
      success: true,
      message: 'Garage removed successfully'
    });

  } catch (error) {
    console.error('Remove garage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing garage',
      error: error.message
    });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings
// @access  Private (Admin)
router.get('/bookings', async (req, res) => {
  try {
    const { 
      status, 
      service, 
      garageId, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};
    
    if (status) query.status = status;
    if (service) query.service = service;
    if (garageId) query.garageId = garageId;
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .populate('garageId', 'garageName ownerName location services')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalBookings,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @route   POST /api/admin/admin
// @desc    Create new admin (Main Admin only)
// @access  Private (Main Admin)
router.post('/admin', [authorizeMainAdmin, [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'main_admin'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'admin' } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const admin = new Admin({
      name,
      email,
      password,
      role,
      createdBy: req.admin.id
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin',
      error: error.message
    });
  }
});

// @route   GET /api/admin/admins
// @desc    Get all admins (Main Admin only)
// @access  Private (Main Admin)
router.get('/admins', authorizeMainAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: admins
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message
    });
  }
});

// Helper function to send garage credentials
async function sendGarageCredentials(garage) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email credentials not configured');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: garage.email,
    subject: 'Welcome to Service Point - Your Garage Account',
    html: `
      <h2>Welcome to Service Point Platform</h2>
      <p>Your garage has been successfully registered!</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h3>Login Details:</h3>
        <p><strong>Email:</strong> ${garage.email}</p>
        <p><strong>Password:</strong> [Auto-generated password will be sent separately]</p>
        <p><strong>Garage ID:</strong> ${garage.garageId}</p>
      </div>
      <p>Please login to your dashboard to manage your garage and bookings.</p>
      <p>Best regards,<br>Service Point Team</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

// Helper function to send email update notification
async function sendEmailUpdateNotification(garage, oldEmail) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email credentials not configured');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: garage.email,
    subject: 'Service Point - Email Address Updated',
    html: `
      <h2>Email Address Updated</h2>
      <p>Your garage account email has been updated by an administrator.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <p><strong>Old Email:</strong> ${oldEmail}</p>
        <p><strong>New Email:</strong> ${garage.email}</p>
        <p><strong>Garage:</strong> ${garage.garageName}</p>
      </div>
      <p>If you didn't request this change, please contact support immediately.</p>
      <p>Best regards,<br>Service Point Team</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = router;
