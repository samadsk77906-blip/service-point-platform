const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'SRV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    minlength: [2, 'Service name must be at least 2 characters'],
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['Towing', 'Oil Change', 'Battery Change', 'Servicing', 'Inspection', 'Tire Repair', 'Engine Repair', 'Brake Service', 'Other'],
    default: 'Other'
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  estimatedDuration: {
    type: String, // e.g., "30 minutes", "2 hours"
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garage',
    required: [true, 'Garage ID is required']
  },
  addedBy: {
    type: String,
    enum: ['admin', 'garage'],
    default: 'garage'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for efficient queries
serviceSchema.index({ garageId: 1, serviceName: 1 });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ serviceId: 1 });

// Virtual for full price display
serviceSchema.virtual('displayPrice').get(function() {
  return `${this.price.currency} ${this.price.amount}`;
});

// Static method to find services by garage
serviceSchema.statics.findByGarage = function(garageId, activeOnly = true) {
  const query = { garageId };
  if (activeOnly) query.isActive = true;
  return this.find(query).sort({ category: 1, serviceName: 1 });
};

// Static method to find services by category
serviceSchema.statics.findByCategory = function(category, activeOnly = true) {
  const query = { category };
  if (activeOnly) query.isActive = true;
  return this.find(query).populate('garageId', 'garageName ownerName location');
};

// Method to toggle active status
serviceSchema.methods.toggleStatus = function() {
  this.isActive = !this.isActive;
  return this.save();
};

// Pre-save middleware to ensure unique service name per garage
serviceSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('serviceName')) {
    const existingService = await this.constructor.findOne({
      garageId: this.garageId,
      serviceName: { $regex: new RegExp(`^${this.serviceName}$`, 'i') },
      _id: { $ne: this._id }
    });
    
    if (existingService) {
      const error = new Error('Service with this name already exists for this garage');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);