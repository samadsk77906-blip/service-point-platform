const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const garageSchema = new mongoose.Schema({
  garageId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'GAR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  garageName: {
    type: String,
    required: [true, 'Garage name is required'],
    trim: true,
    minlength: [2, 'Garage name must be at least 2 characters'],
    maxlength: [100, 'Garage name cannot exceed 100 characters']
  },
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true,
    minlength: [2, 'Owner name must be at least 2 characters'],
    maxlength: [50, 'Owner name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    default: function() {
      return Math.random().toString(36).slice(-8); // Generate random password
    }
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[0-9+\-\s\(\)]{10,18}$/, 'Please enter a valid contact number (10-18 digits, spaces, +, -, () allowed)']
  },
  // Legacy location field (kept for backward compatibility)
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    minlength: [5, 'Location must be at least 5 characters'],
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  // New structured location fields
  locationHierarchy: {
    country: {
      type: String,
      default: 'India',
      required: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    }
  },
  // GPS coordinates for location-based search
  coordinates: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required for accurate location services'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required for accurate location services'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  // Additional garage details
  services: [{
    type: String,
    enum: ['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service', 'AC Repair', 'Body Work', 'Painting', 'Electrical', 'General Repair', 'Diagnostics', 'Maintenance']
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
garageSchema.index({ garageId: 1 });
garageSchema.index({ email: 1 });
garageSchema.index({ location: 1 });
garageSchema.index({ isActive: 1 });
// New indexes for location hierarchy and GPS
garageSchema.index({ 'locationHierarchy.state': 1 });
garageSchema.index({ 'locationHierarchy.city': 1 });
garageSchema.index({ 'locationHierarchy.district': 1 });
garageSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
garageSchema.index({ services: 1 });
garageSchema.index({ rating: -1 });

// Hash password before saving
garageSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
garageSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
garageSchema.methods.toJSON = function() {
  const garage = this.toObject();
  delete garage.password;
  return garage;
};

// Static method to find garage by email
garageSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find garages by location text search
garageSchema.statics.findByLocation = function(locationText) {
  return this.find({ 
    location: { $regex: locationText, $options: 'i' },
    isActive: true 
  });
};

// Static method to find garage by ID
garageSchema.statics.findByGarageId = function(garageId) {
  return this.findOne({ garageId: garageId.toUpperCase() });
};

// Static method to find garages by location hierarchy
garageSchema.statics.findByLocationHierarchy = function(state, city, district, service = null) {
  const query = {
    isActive: true,
    'locationHierarchy.state': state
  };
  
  if (city) query['locationHierarchy.city'] = city;
  if (district) query['locationHierarchy.district'] = district;
  if (service) query.services = service;
  
  return this.find(query).sort({ rating: -1, totalRatings: -1 });
};

// Static method to find nearby garages using GPS coordinates
garageSchema.statics.findNearbyGarages = function(latitude, longitude, maxDistanceKm = 50, service = null) {
  const query = {
    isActive: true,
    'coordinates.latitude': { $exists: true, $ne: null },
    'coordinates.longitude': { $exists: true, $ne: null }
  };
  
  if (service) query.services = service;
  
  return this.aggregate([
    { $match: query },
    {
      $addFields: {
        distance: {
          $multiply: [
            6371, // Earth's radius in kilometers
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $multiply: [{ $degreesToRadians: '$coordinates.latitude' }, 1] } },
                      { $sin: { $multiply: [{ $degreesToRadians: latitude }, 1] } }
                    ]
                  },
                  {
                    $multiply: [
                      { $cos: { $multiply: [{ $degreesToRadians: '$coordinates.latitude' }, 1] } },
                      { $cos: { $multiply: [{ $degreesToRadians: latitude }, 1] } },
                      { $cos: { $subtract: [{ $degreesToRadians: longitude }, { $degreesToRadians: '$coordinates.longitude' }] } }
                    ]
                  }
                ]
              }
            }
          ]
        }
      }
    },
    { $match: { distance: { $lte: maxDistanceKm } } },
    { $sort: { distance: 1, rating: -1 } }
  ]);
};

// Static method to get unique states
garageSchema.statics.getUniqueStates = function() {
  return this.distinct('locationHierarchy.state', { isActive: true });
};

// Static method to get unique cities by state
garageSchema.statics.getUniqueCities = function(state) {
  return this.distinct('locationHierarchy.city', { 
    'locationHierarchy.state': state,
    isActive: true 
  });
};

// Static method to get unique districts by city
garageSchema.statics.getUniqueDistricts = function(state, city) {
  return this.distinct('locationHierarchy.district', { 
    'locationHierarchy.state': state,
    'locationHierarchy.city': city,
    isActive: true 
  });
};

module.exports = mongoose.model('Garage', garageSchema);
