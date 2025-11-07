// Frontend configuration
// Replace this with your deployed backend URL when needed
const CONFIG = {
  API_BASE_URL: window.location.origin.replace(/\/$/, '') + '/api',
  
  // Google Maps configuration
  GOOGLE_MAPS: {
    // Google Maps API key - configured and ready to use
    // Get one from: https://developers.google.com/maps/documentation/javascript/get-api-key
    API_KEY: 'AIzaSyB8XzDFJZsOEJTMX9B2YOHMv2XfDyE8W8o',
    
    // Default map settings for India (adjust based on your service area)
    DEFAULT_CENTER: {
      lat: 19.0760, // Mumbai, India
      lng: 72.8777
    },
    DEFAULT_ZOOM: 12,
    
    // Map styling and controls
    MAP_OPTIONS: {
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    },
    
    // For places/geocoding services
    LIBRARIES: ['places']
  },
  
  // GPS settings
  GPS: {
    TIMEOUT: 10000, // 10 seconds
    HIGH_ACCURACY: true,
    DEFAULT_RADIUS: 10 // km
  },
  
  // Deprecated - kept for backward compatibility
  MAPS_API_KEY: 'YOUR_API_KEY'
};

// Common API endpoints
const ENDPOINTS = {
  // Auth
  adminLogin: () => `${CONFIG.API_BASE_URL}/auth/admin/login`,
  adminRegister: () => `${CONFIG.API_BASE_URL}/auth/admin/register`,
  garageLogin: () => `${CONFIG.API_BASE_URL}/auth/garage/login`,

  // Admin
  adminDashboard: () => `${CONFIG.API_BASE_URL}/admin/dashboard`,
  garages: (query = '') => `${CONFIG.API_BASE_URL}/admin/garages${query}`,

  // Public Garage
  garageSearch: (query = '') => `${CONFIG.API_BASE_URL}/garage/search${query}`,
  garageLocations: (query = '') => `${CONFIG.API_BASE_URL}/garage/locations${query}`,
  garageMapLocations: () => `${CONFIG.API_BASE_URL}/garage/map-locations`,
  garageById: (id) => `${CONFIG.API_BASE_URL}/garage/${id}`,

  // Bookings
  bookingCreate: () => `${CONFIG.API_BASE_URL}/booking/create`,
  bookingTrack: (bookingId) => `${CONFIG.API_BASE_URL}/booking/track/${bookingId}`,
  bookingByUser: (phone) => `${CONFIG.API_BASE_URL}/booking/user/${phone}`,

  // User
  userDashboard: (phone) => `${CONFIG.API_BASE_URL}/user/dashboard/${phone}`,
  userProfile: () => `${CONFIG.API_BASE_URL}/user/profile`,
  
  // Location endpoints
  locationStates: () => `${CONFIG.API_BASE_URL}/location/states`,
  locationCities: (state) => `${CONFIG.API_BASE_URL}/location/cities/${encodeURIComponent(state)}`,
  locationDistricts: (state, city) => `${CONFIG.API_BASE_URL}/location/districts/${encodeURIComponent(state)}/${encodeURIComponent(city)}`,
  
  // Location-based garage search
  garageSearchByLocation: () => `${CONFIG.API_BASE_URL}/location/garages/search`,
  garageNearby: () => `${CONFIG.API_BASE_URL}/location/garages/nearby`,
};

