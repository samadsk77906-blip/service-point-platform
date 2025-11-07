const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'BK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  service: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service']
  },
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  userPhone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  userEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ]
  },
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garage',
    required: [true, 'Garage selection is required']
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    validate: {
      validator: function(date) {
        // Compare dates only (not time) to allow bookings for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= today;
      },
      message: 'Scheduled date cannot be in the past'
    }
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  estimatedCost: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  actualCost: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  vehicleInfo: {
    make: String,
    model: String,
    year: Number,
    licensePlate: String,
    color: String
  },
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [300, 'Feedback cannot exceed 300 characters']
    },
    submittedAt: Date
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String, // 'user', 'garage', 'admin'
      required: true
    },
    note: String
  }],
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ userPhone: 1 });
bookingSchema.index({ garageId: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for full scheduled datetime
bookingSchema.virtual('scheduledDateTime').get(function() {
  if (this.scheduledDate && this.scheduledTime) {
    const [hours, minutes] = this.scheduledTime.split(':');
    const date = new Date(this.scheduledDate);
    date.setHours(parseInt(hours), parseInt(minutes));
    return date;
  }
  return null;
});

// Pre-save middleware to update status history
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this._updatedBy || 'system',
      timestamp: new Date()
    });
    
    // Set completion or cancellation timestamps
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
  next();
});

// Static method to find bookings by phone
bookingSchema.statics.findByPhone = function(phone) {
  return this.find({ userPhone: phone }).populate('garageId', 'garageName ownerName location services');
};

// Static method to find bookings by booking ID
bookingSchema.statics.findByBookingId = function(bookingId) {
  return this.findOne({ bookingId: bookingId.toUpperCase() }).populate('garageId', 'garageName ownerName location services mobile email');
};

// Static method to find garage bookings
bookingSchema.statics.findByGarage = function(garageId, status = null) {
  const query = { garageId };
  if (status) query.status = status;
  return this.find(query).sort({ scheduledDate: 1 });
};

// Method to update status with history
bookingSchema.methods.updateStatus = function(newStatus, updatedBy = 'system', note = '') {
  this._updatedBy = updatedBy;
  this.status = newStatus;
  
  if (note) {
    this.statusHistory.push({
      status: newStatus,
      updatedBy,
      note,
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status) && 
         this.scheduledDateTime > new Date();
};

module.exports = mongoose.model('Booking', bookingSchema);
