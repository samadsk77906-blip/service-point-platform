const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ]
  },
  vehicleDetails: [{
    make: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 2
    },
    licensePlate: {
      type: String,
      trim: true,
      uppercase: true
    },
    color: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferredLocation: {
    country: String,
    state: String,
    city: String,
    district: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  bookingHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true }
    },
    preferredServices: [{
      type: String,
      enum: ['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service']
    }],
    maxDistance: {
      type: Number,
      default: 10, // kilometers
      min: 1,
      max: 100
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ 'preferredLocation.country': 1, 'preferredLocation.state': 1, 'preferredLocation.city': 1 });

// Virtual for total bookings
userSchema.virtual('totalBookings').get(function() {
  return this.bookingHistory.length;
});

// Virtual for default vehicle
userSchema.virtual('defaultVehicle').get(function() {
  return this.vehicleDetails.find(vehicle => vehicle.isDefault) || this.vehicleDetails[0];
});

// Pre-save middleware to ensure only one default vehicle
userSchema.pre('save', function(next) {
  if (this.isModified('vehicleDetails')) {
    const defaultVehicles = this.vehicleDetails.filter(vehicle => vehicle.isDefault);
    
    if (defaultVehicles.length > 1) {
      // Keep only the first default, set others to false
      this.vehicleDetails.forEach((vehicle, index) => {
        if (vehicle.isDefault && index > 0) {
          vehicle.isDefault = false;
        }
      });
    } else if (defaultVehicles.length === 0 && this.vehicleDetails.length > 0) {
      // Set first vehicle as default if no default is set
      this.vehicleDetails[0].isDefault = true;
    }
  }
  next();
});

// Static method to find user by phone
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

// Static method to find or create user
userSchema.statics.findOrCreate = function(userData) {
  return this.findOne({ phone: userData.phone })
    .then(user => {
      if (user) {
        return user;
      }
      return this.create(userData);
    });
};

// Method to add vehicle
userSchema.methods.addVehicle = function(vehicleData) {
  // If this is the first vehicle, make it default
  if (this.vehicleDetails.length === 0) {
    vehicleData.isDefault = true;
  }
  
  this.vehicleDetails.push(vehicleData);
  return this.save();
};

// Method to set default vehicle
userSchema.methods.setDefaultVehicle = function(vehicleIndex) {
  if (vehicleIndex >= 0 && vehicleIndex < this.vehicleDetails.length) {
    this.vehicleDetails.forEach((vehicle, index) => {
      vehicle.isDefault = index === vehicleIndex;
    });
    return this.save();
  }
  throw new Error('Invalid vehicle index');
};

// Method to remove vehicle
userSchema.methods.removeVehicle = function(vehicleIndex) {
  if (vehicleIndex >= 0 && vehicleIndex < this.vehicleDetails.length) {
    const wasDefault = this.vehicleDetails[vehicleIndex].isDefault;
    this.vehicleDetails.splice(vehicleIndex, 1);
    
    // If removed vehicle was default, set first remaining vehicle as default
    if (wasDefault && this.vehicleDetails.length > 0) {
      this.vehicleDetails[0].isDefault = true;
    }
    
    return this.save();
  }
  throw new Error('Invalid vehicle index');
};

// Method to add booking to history
userSchema.methods.addBooking = function(bookingId) {
  if (!this.bookingHistory.includes(bookingId)) {
    this.bookingHistory.push(bookingId);
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('User', userSchema);
