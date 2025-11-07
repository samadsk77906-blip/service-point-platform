const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Garage = require('../models/Garage');
const User = require('../models/User');
const { rateLimit } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Apply rate limiting to booking routes
router.use(rateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

// @route   POST /api/booking/create
// @desc    Create new booking
// @access  Public
router.post('/create', [
  body('service').isIn(['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service']),
  body('userName').trim().isLength({ min: 2 }),
  body('userPhone').matches(/^[0-9]{10,15}$/),
  body('userEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('garageId').isMongoId(),
  body('scheduledDate').isISO8601(),
  body('scheduledTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('notes').optional().isLength({ max: 500 })
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

    const {
      service,
      userName,
      userPhone,
      userEmail,
      garageId,
      scheduledDate,
      scheduledTime,
      notes,
      vehicleInfo,
      location
    } = req.body;

    // Verify garage exists and is active
    const garage = await Garage.findById(garageId);
    if (!garage || !garage.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Selected garage is not available'
      });
    }

    // Auto-add service to garage if not present (for development)
    if (!garage.services.includes(service)) {
      console.log(`🔧 Adding service "${service}" to garage "${garage.garageName}"`);
      garage.services.push(service);
      await garage.save();
    }

    // Validate scheduled date and time
    const bookingDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const minimumBookingTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    
    if (bookingDateTime < minimumBookingTime) {
      const today = now.toISOString().split('T')[0];
      const selectedDate = scheduledDate;
      
      if (selectedDate === today) {
        return res.status(400).json({
          success: false,
          message: 'For today\'s bookings, please select a time at least 15 minutes from now'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Cannot book for past dates and times'
        });
      }
    }

    // Create new booking
    const booking = new Booking({
      service,
      userName,
      userPhone,
      userEmail,
      garageId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      notes,
      vehicleInfo,
      location
    });

    // Add initial status to history
    booking.statusHistory.push({
      status: 'pending',
      updatedBy: 'user',
      timestamp: new Date()
    });

    await booking.save();

    // Find or create user
    try {
      await User.findOrCreate({
        name: userName,
        phone: userPhone,
        email: userEmail
      });
    } catch (userError) {
      console.error('User creation failed:', userError);
      // Continue even if user creation fails
    }

    // Populate garage details for response
    await booking.populate('garageId', 'garageName ownerName location services email contactNumber');

    // Send email notification to garage owner
    try {
      const garageData = {
        email: booking.garageId.email,
        garageName: booking.garageId.garageName,
        ownerName: booking.garageId.ownerName,
        contactNumber: booking.garageId.contactNumber
      };
      
      const bookingData = {
        bookingId: booking.bookingId,
        service: booking.service,
        userName: booking.userName,
        userPhone: booking.userPhone,
        userEmail: booking.userEmail,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        notes: booking.notes,
        vehicleInfo: booking.vehicleInfo,
        location: booking.location,
        createdAt: booking.createdAt
      };
      
      const emailResult = await emailService.sendBookingNotificationToGarage(bookingData, garageData);
      if (emailResult.success) {
        console.log('📧 Booking notification email sent to garage:', garageData.email);
      }
    } catch (emailError) {
      console.error('❌ Failed to send booking notification email:', emailError.message);
      // Don't fail the booking creation if email fails
    }

    res.status(201).json({
      success: true,
      message: `✅ Booking Successful – Your booking ID is ${booking.bookingId}`,
      booking: {
        bookingId: booking.bookingId,
        service: booking.service,
        garage: {
          name: booking.garageId.garageName,
          owner: booking.garageId.ownerName,
          location: booking.garageId.location,
          mobile: booking.garageId.mobile,
          email: booking.garageId.email
        },
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        status: booking.status,
        createdAt: booking.createdAt
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

// @route   GET /api/booking/track/:bookingId
// @desc    Track booking by booking ID
// @access  Public
router.get('/track/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Handle garage information (might be null)
    let garageInfo = null;
    if (booking.garageId) {
      garageInfo = {
        name: booking.garageId.garageName || booking.garageId.name,
        owner: booking.garageId.ownerName,
        location: booking.garageId.location,
        mobile: booking.garageId.mobile || booking.garageId.phone,
        email: booking.garageId.email
      };
    }

    res.json({
      success: true,
      data: {
        bookingId: booking.bookingId,
        service: booking.service,
        userName: booking.userName,
        userPhone: booking.userPhone,
        userEmail: booking.userEmail,
        garage: garageInfo,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        status: booking.status,
        notes: booking.notes,
        vehicleInfo: booking.vehicleInfo,
        location: booking.location,
        statusHistory: booking.statusHistory,
        estimatedCost: booking.estimatedCost,
        actualCost: booking.actualCost,
        feedback: booking.feedback,
        createdAt: booking.createdAt,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
    });

  } catch (error) {
    console.error('Track booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking booking',
      error: error.message
    });
  }
});

// @route   GET /api/booking/user/:phone
// @desc    Get bookings by phone number
// @access  Public
router.get('/user/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate phone number format
    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    let query = { userPhone: phone };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .populate('garageId', 'garageName ownerName location services mobile email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    res.json({
      success: true,
      data: {
        bookings: bookings.map(booking => ({
          bookingId: booking.bookingId,
          service: booking.service,
          garage: {
            name: booking.garageId.garageName,
            owner: booking.garageId.ownerName,
            location: booking.garageId.location
          },
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          status: booking.status,
          createdAt: booking.createdAt,
          completedAt: booking.completedAt
        })),
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
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @route   PUT /api/booking/:bookingId/cancel
// @desc    Cancel a booking
// @access  Public
router.put('/:bookingId/cancel', [
  body('cancellationReason').optional().isLength({ max: 200 })
], async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason = 'Cancelled by user' } = req.body;

    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled at this time'
      });
    }

    // Update booking status
    booking.cancellationReason = cancellationReason;
    await booking.updateStatus('cancelled', 'user', `Cancelled: ${cancellationReason}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      bookingId: booking.bookingId
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
});

// @route   POST /api/booking/:bookingId/feedback
// @desc    Submit booking feedback
// @access  Public
router.post('/:bookingId/feedback', [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 300 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: errors.array()
      });
    }

    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for completed bookings'
      });
    }

    // Check if feedback already exists
    if (booking.feedback.rating) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this booking'
      });
    }

    // Update booking with feedback
    booking.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await booking.save();

    // Update garage rating (simplified calculation)
    const garage = await Garage.findById(booking.garageId);
    if (garage) {
      const allBookingsWithFeedback = await Booking.find({
        garageId: garage._id,
        'feedback.rating': { $exists: true, $ne: null }
      });

      const totalRatings = allBookingsWithFeedback.length;
      const sumRatings = allBookingsWithFeedback.reduce((sum, b) => sum + b.feedback.rating, 0);
      
      garage.rating.average = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
      garage.rating.totalReviews = totalRatings;
      
      await garage.save();
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: booking.feedback
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
});

// @route   GET /api/booking/available-slots/:garageId/:date
// @desc    Get available time slots for a garage on a specific date
// @access  Public
router.get('/available-slots/:garageId/:date', async (req, res) => {
  try {
    const { garageId, date } = req.params;

    // Verify garage exists
    const garage = await Garage.findById(garageId);
    if (!garage || !garage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    const requestedDate = new Date(date);
    const dayName = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Get garage operating hours for the day
    const operatingHours = garage.operatingHours[dayName];
    if (!operatingHours || !operatingHours.isOpen) {
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'Garage is closed on this day'
        }
      });
    }

    // Get existing bookings for the date
    const existingBookings = await Booking.find({
      garageId,
      scheduledDate: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    }).select('scheduledTime');

    const bookedSlots = existingBookings.map(booking => booking.scheduledTime);

    // Generate available slots (simplified - every hour from open to close)
    const availableSlots = [];
    const openTime = operatingHours.open || '09:00';
    const closeTime = operatingHours.close || '18:00';

    const [openHour] = openTime.split(':').map(Number);
    const [closeHour] = closeTime.split(':').map(Number);

    for (let hour = openHour; hour < closeHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      if (!bookedSlots.includes(timeSlot)) {
        availableSlots.push(timeSlot);
      }
    }

    res.json({
      success: true,
      data: {
        availableSlots,
        operatingHours,
        totalSlots: availableSlots.length
      }
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
});

// @route   GET /api/booking/garage/:garageId
// @desc    Get bookings for a specific garage
// @access  Private (Garage)
router.get('/garage/:garageId', async (req, res) => {
  try {
    const { garageId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Validate garageId is a valid ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(garageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid garage ID'
      });
    }

    // Verify garage exists
    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found'
      });
    }

    let query = { garageId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    // Get booking statistics
    const stats = {
      total: await Booking.countDocuments({ garageId }),
      pending: await Booking.countDocuments({ garageId, status: 'pending' }),
      confirmed: await Booking.countDocuments({ garageId, status: 'confirmed' }),
      in_progress: await Booking.countDocuments({ garageId, status: 'in_progress' }),
      completed: await Booking.countDocuments({ garageId, status: 'completed' }),
      cancelled: await Booking.countDocuments({ garageId, status: 'cancelled' })
    };

    res.json({
      success: true,
      data: {
        bookings: bookings.map(booking => ({
          _id: booking._id,
          bookingId: booking.bookingId,
          service: booking.service,
          userName: booking.userName,
          userPhone: booking.userPhone,
          userEmail: booking.userEmail,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          status: booking.status,
          priority: booking.priority,
          notes: booking.notes,
          vehicleInfo: booking.vehicleInfo,
          location: booking.location,
          estimatedCost: booking.estimatedCost,
          actualCost: booking.actualCost,
          createdAt: booking.createdAt,
          statusHistory: booking.statusHistory
        })),
        stats,
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
      message: 'Error fetching garage bookings',
      error: error.message
    });
  }
});

// @route   PUT /api/booking/:bookingId/status
// @desc    Update booking status (Accept/Reject by garage)
// @access  Private (Garage)
router.put('/:bookingId/status', [
  body('status').isIn(['confirmed', 'in_progress', 'completed', 'cancelled']),
  body('note').optional().isLength({ max: 300 }),
  body('estimatedCost.amount').optional().isFloat({ min: 0 }),
  body('actualCost.amount').optional().isFloat({ min: 0 })
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
    const { status, note = '', estimatedCost, actualCost } = req.body;

    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${booking.status} to ${status}`
      });
    }

    // Update booking status
    booking.status = status;
    
    // Update costs if provided
    if (estimatedCost) {
      booking.estimatedCost = estimatedCost;
    }
    if (actualCost) {
      booking.actualCost = actualCost;
    }

    // Add to status history
    booking.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: 'garage',
      note
    });

    // Set completion timestamp
    if (status === 'completed' && !booking.completedAt) {
      booking.completedAt = new Date();
    }
    
    // Set cancellation timestamp
    if (status === 'cancelled' && !booking.cancelledAt) {
      booking.cancelledAt = new Date();
      if (note) booking.cancellationReason = note;
    }

    await booking.save();

    // Send email notification to user if email is provided
    try {
      if (booking.userEmail) {
        const garageData = await Garage.findById(booking.garageId);
        if (garageData) {
          const bookingData = {
            bookingId: booking.bookingId,
            service: booking.service,
            userName: booking.userName,
            userEmail: booking.userEmail
          };
          
          const garageInfo = {
            garageName: garageData.garageName,
            contactNumber: garageData.contactNumber
          };
          
          const emailResult = await emailService.sendBookingStatusUpdateToUser(bookingData, garageInfo, status);
          if (emailResult.success) {
            console.log('📧 Status update email sent to user:', booking.userEmail);
          }
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send status update email:', emailError.message);
      // Don't fail the status update if email fails
    }

    // Create response message
    let message = '';
    switch (status) {
      case 'confirmed':
        message = '✅ Booking accepted successfully';
        break;
      case 'cancelled':
        message = '❌ Booking rejected';
        break;
      case 'in_progress':
        message = '🔧 Service started';
        break;
      case 'completed':
        message = '✅ Service completed successfully';
        break;
      default:
        message = 'Booking status updated';
    }

    res.json({
      success: true,
      message,
      data: {
        bookingId: booking.bookingId,
        status: booking.status,
        updatedAt: new Date()
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

module.exports = router;
