const express = require('express');
const { body, validationResult } = require('express-validator');
const Garage = require('../models/Garage');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { authenticateGarage, authorizeGarageOwner, validateSessionTimeout, rateLimit } = require('../middleware/auth');

const router = express.Router();

// Apply rate limiting
router.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// @route   GET /api/garage/search
// @desc    Search garages by location and filters
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { 
      country, 
      state, 
      city, 
      district, 
      service,
      lat,
      lng,
      radius = 10,
      page = 1, 
      limit = 20,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    let query = { isActive: true };
    
    // Location-based search
    if (lat && lng) {
      // Geographic search using coordinates
      query.geo = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      };
    } else {
      // Text-based location search
      if (country) query['location.country'] = { $regex: country, $options: 'i' };
      if (state) query['location.state'] = { $regex: state, $options: 'i' };
      if (city) query['location.city'] = { $regex: city, $options: 'i' };
      if (district) query['location.district'] = { $regex: district, $options: 'i' };
    }

    // Service filter
    if (service) {
      query.services = { $in: [service] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const garages = await Garage.find(query)
      .select('-password -createdBy')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalGarages = await Garage.countDocuments(query);
    const totalPages = Math.ceil(totalGarages / parseInt(limit));

    res.json({
      success: true,
      data: {
        garages: garages.map(garage => ({
          id: garage._id,
          garageId: garage.garageId,
          garageName: garage.garageName,
          ownerName: garage.ownerName,
          email: garage.email,
          mobile: garage.mobile,
          location: garage.location,
          geo: garage.geo,
          services: garage.services,
          rating: garage.rating,
          operatingHours: garage.operatingHours,
          isVerified: garage.isVerified
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalGarages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          country,
          state,
          city,
          district,
          service,
          coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
          radius: parseFloat(radius)
        }
      }
    });

  } catch (error) {
    console.error('Garage search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching garages',
      error: error.message
    });
  }
});

// @route   GET /api/garage/locations
// @desc    Get unique location values for dropdowns
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const { country, state, city } = req.query;
    
    let matchStage = { isActive: true };
    if (country) matchStage['location.country'] = { $regex: country, $options: 'i' };
    if (state) matchStage['location.state'] = { $regex: state, $options: 'i' };
    if (city) matchStage['location.city'] = { $regex: city, $options: 'i' };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          countries: { $addToSet: '$location.country' },
          states: { $addToSet: '$location.state' },
          cities: { $addToSet: '$location.city' },
          districts: { $addToSet: '$location.district' }
        }
      }
    ];

    const result = await Garage.aggregate(pipeline);
    const locations = result[0] || { countries: [], states: [], cities: [], districts: [] };

    res.json({
      success: true,
      data: {
        countries: locations.countries.sort(),
        states: locations.states.sort(),
        cities: locations.cities.sort(),
        districts: locations.districts.sort()
      }
    });

  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
    });
  }
});

// @route   GET /api/garage/map-locations
// @desc    Get all active garages with coordinates for map display
// @access  Public
router.get('/map-locations', async (req, res) => {
  try {
    const garages = await Garage.find({ 
      isActive: true,
      geo: { $exists: true, $ne: null }
    })
    .select('_id garageId garageName ownerName email contactNumber mobile location geo services rating isVerified')
    .limit(200); // Limit to prevent too many markers

    const garageData = garages.map(garage => ({
      _id: garage._id,
      garageId: garage.garageId,
      garageName: garage.garageName,
      ownerName: garage.ownerName,
      contactNumber: garage.contactNumber || garage.mobile,
      location: garage.location,
      geo: garage.geo,
      services: garage.services || [],
      rating: garage.rating,
      isVerified: garage.isVerified
    }));

    res.json({
      success: true,
      data: {
        garages: garageData,
        total: garageData.length
      }
    });

  } catch (error) {
    console.error('Get map locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage locations',
      error: error.message
    });
  }
});

// @route   GET /api/garage/service-categories
// @desc    Get available services list
// @access  Public
router.get('/service-categories', async (req, res) => {
  try {
    const services = [
      'Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 
      'Tire Repair', 'Engine Repair', 'Brake Service', 'AC Repair', 'Body Work', 
      'Painting', 'Electrical', 'General Repair', 'Diagnostics', 'Maintenance'
    ];

    res.json({
      success: true,
      data: {
        services: services.sort()
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

// @route   GET /api/garage/services
// @desc    Get all services for the garage
// @access  Private (Garage)
router.get('/services', authenticateGarage, authorizeGarageOwner, async (req, res) => {
  try {
    const services = await Service.findByGarage(req.garage.id);
    
    res.json({
      success: true,
      data: {
        services,
        totalServices: services.length
      }
    });
    
  } catch (error) {
    console.error('Get garage services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

// @route   GET /api/garage/:id
// @desc    Get single garage details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id)
      .select('-password -createdBy');

    if (!garage || !garage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    // Get recent reviews
    const recentBookings = await Booking.find({
      garageId: garage._id,
      'feedback.rating': { $exists: true, $ne: null }
    })
    .select('feedback userName createdAt')
    .sort({ 'feedback.submittedAt': -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        garage: {
          id: garage._id,
          garageId: garage.garageId,
          garageName: garage.garageName,
          ownerName: garage.ownerName,
          email: garage.email,
          mobile: garage.mobile,
          location: garage.location,
          geo: garage.geo,
          services: garage.services,
          pricing: garage.pricing,
          operatingHours: garage.operatingHours,
          rating: garage.rating,
          isVerified: garage.isVerified,
          createdAt: garage.createdAt
        },
        recentReviews: recentBookings.map(booking => ({
          userName: booking.userName,
          rating: booking.feedback.rating,
          comment: booking.feedback.comment,
          date: booking.feedback.submittedAt || booking.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get garage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage details',
      error: error.message
    });
  }
});

// Protected routes - require garage authentication
// First validate session timeout, then authenticate
router.use(validateSessionTimeout);
router.use(authenticateGarage);

// @route   GET /api/garage/dashboard/stats
// @desc    Get garage dashboard statistics
// @access  Private (Garage)
router.get('/dashboard/stats', authorizeGarageOwner, async (req, res) => {
  try {
    const garageId = req.garage.id;

    const stats = {
      totalBookings: await Booking.countDocuments({ garageId }),
      pendingBookings: await Booking.countDocuments({ garageId, status: 'pending' }),
      confirmedBookings: await Booking.countDocuments({ garageId, status: 'confirmed' }),
      completedBookings: await Booking.countDocuments({ garageId, status: 'completed' }),
      cancelledBookings: await Booking.countDocuments({ garageId, status: 'cancelled' }),
      
      // This month's stats
      thisMonth: {
        bookings: await Booking.countDocuments({
          garageId,
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        completed: await Booking.countDocuments({
          garageId,
          status: 'completed',
          completedAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        })
      },

      // Recent bookings
      recentBookings: await Booking.find({ garageId })
        .select('bookingId service userName userPhone scheduledDate scheduledTime status createdAt')
        .sort({ createdAt: -1 })
        .limit(10),

      // Service breakdown
      serviceStats: await Booking.aggregate([
        { $match: { garageId: req.garage.id } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Garage dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// @route   GET /api/garage/bookings
// @desc    Get garage bookings
// @access  Private (Garage)
router.get('/bookings', authorizeGarageOwner, async (req, res) => {
  try {
    const { 
      status, 
      service, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { garageId: req.garage.id };
    
    if (status) query.status = status;
    if (service) query.service = service;
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .sort({ scheduledDate: 1, scheduledTime: 1 })
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
    console.error('Get garage bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @route   PUT /api/garage/booking/:bookingId/status
// @desc    Update booking status
// @access  Private (Garage)
router.put('/booking/:bookingId/status', [
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  body('note').optional().isLength({ max: 200 }),
  body('estimatedCost').optional().isNumeric({ min: 0 }),
  body('actualCost').optional().isNumeric({ min: 0 })
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

    const { bookingId } = req.params;
    const { status, note, estimatedCost, actualCost } = req.body;

    const booking = await Booking.findOne({ 
      bookingId: bookingId.toUpperCase(),
      garageId: req.garage.id 
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update cost information if provided
    if (estimatedCost !== undefined) {
      booking.estimatedCost.amount = parseFloat(estimatedCost);
    }
    if (actualCost !== undefined) {
      booking.actualCost.amount = parseFloat(actualCost);
    }

    // Update status with history
    await booking.updateStatus(status, 'garage', note);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        estimatedCost: booking.estimatedCost,
        actualCost: booking.actualCost
      }
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
});

// @route   GET /api/garage/profile
// @desc    Get garage profile
// @access  Private (Garage)
router.get('/profile', authorizeGarageOwner, async (req, res) => {
  try {
    const garage = await Garage.findById(req.garage.id)
      .select('-password');

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
    console.error('Get garage profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// @route   PUT /api/garage/profile
// @desc    Update garage profile (excluding email)
// @access  Private (Garage)
router.put('/profile', [
  body('garageName').optional().trim().isLength({ min: 2 }),
  body('ownerName').optional().trim().isLength({ min: 2 }),
  body('mobile').optional().matches(/^[0-9]{10,15}$/),
  body('services').optional().isArray({ min: 1 }),
  body('pricing').optional().isArray(),
  body('operatingHours').optional().isObject()
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

    const garage = await Garage.findById(req.garage.id);
    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    const updates = req.body;
    
    // Remove email from updates (only admin can change email)
    delete updates.email;
    delete updates.location; // Location changes might need admin approval

    // Update garage
    Object.keys(updates).forEach(key => {
      garage[key] = updates[key];
    });

    await garage.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      garage: garage
    });

  } catch (error) {
    console.error('Update garage profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});


// @route   POST /api/garage/service
// @desc    Add new service
// @access  Private (Garage)
router.post('/service', [
  body('serviceName').trim().isLength({ min: 2 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('category').isIn(['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service', 'Other']),
  body('price.amount').isNumeric({ min: 0 }),
  body('estimatedDuration').optional().trim().isLength({ max: 50 })
], authorizeGarageOwner, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { serviceName, description, category, price, estimatedDuration } = req.body;

    // Create new service
    const service = new Service({
      serviceName,
      description,
      category,
      price,
      estimatedDuration,
      garageId: req.garage.id,
      addedBy: 'garage'
    });

    await service.save();

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      service
    });

  } catch (error) {
    console.error('Add service error:', error);
    if (error.name === 'ValidationError' && error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding service',
      error: error.message
    });
  }
});

// @route   PUT /api/garage/service/:serviceId
// @desc    Update service
// @access  Private (Garage)
router.put('/service/:serviceId', [
  body('serviceName').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('category').optional().isIn(['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service', 'Other']),
  body('price.amount').optional().isNumeric({ min: 0 }),
  body('estimatedDuration').optional().trim().isLength({ max: 50 })
], authorizeGarageOwner, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const service = await Service.findOne({ 
      _id: req.params.serviceId,
      garageId: req.garage.id 
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update service fields
    Object.keys(req.body).forEach(key => {
      service[key] = req.body[key];
    });

    await service.save();

    res.json({
      success: true,
      message: 'Service updated successfully',
      service
    });

  } catch (error) {
    console.error('Update service error:', error);
    if (error.name === 'ValidationError' && error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: error.message
    });
  }
});

// @route   DELETE /api/garage/service/:serviceId
// @desc    Delete service
// @access  Private (Garage)
router.delete('/service/:serviceId', authorizeGarageOwner, async (req, res) => {
  try {
    const service = await Service.findOne({ 
      _id: req.params.serviceId,
      garageId: req.garage.id 
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await service.deleteOne();

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: error.message
    });
  }
});

module.exports = router;
