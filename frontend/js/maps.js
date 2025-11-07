// Google Maps Integration Module
class MapsManager {
  constructor() {
    this.map = null;
    this.markers = [];
    this.infoWindows = [];
    this.directionsService = null;
    this.directionsRenderer = null;
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  // Load Google Maps API dynamically
  async loadGoogleMaps() {
    // Check if already loaded (either directly or dynamically)
    if (window.google && window.google.maps) {
      console.log('✅ Google Maps already available');
      this.isLoaded = true;
      return Promise.resolve(true);
    }
    
    // If loading is already in progress
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      // Double check if loaded while waiting
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(true);
        return;
      }

      // Check if API key is configured
      if (!CONFIG.GOOGLE_MAPS?.API_KEY || CONFIG.GOOGLE_MAPS.API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.warn('⚠️ Google Maps API key not configured. Map functionality will be limited.');
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      console.log('🔑 Using API Key:', CONFIG.GOOGLE_MAPS.API_KEY.substring(0, 10) + '...');

      // Create script element
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      
      const libraries = CONFIG.GOOGLE_MAPS.LIBRARIES?.join(',') || 'places,geometry';
      const apiUrl = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS.API_KEY}&libraries=${libraries}&callback=initGoogleMapsCallback`;
      
      console.log('🌍 Loading Google Maps from:', apiUrl);
      script.src = apiUrl;
      
      // Global callback function
      window.initGoogleMapsCallback = () => {
        console.log('✅ Google Maps API callback triggered');
        this.isLoaded = true;
        resolve(true);
        console.log('✅ Google Maps API loaded successfully');
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps script:', error);
        reject(new Error('Failed to load Google Maps API script'));
      };

      script.onload = () => {
        console.log('📦 Google Maps script loaded, waiting for callback...');
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  // Initialize map in a container
  async initMap(containerId = 'google-map') {
    try {
      await this.loadGoogleMaps();
      
      const mapContainer = document.getElementById(containerId);
      if (!mapContainer) {
        throw new Error(`Map container '${containerId}' not found`);
      }

      const mapOptions = {
        center: CONFIG.GOOGLE_MAPS.DEFAULT_CENTER || { lat: 19.0760, lng: 72.8777 },
        zoom: CONFIG.GOOGLE_MAPS.DEFAULT_ZOOM || 12,
        ...CONFIG.GOOGLE_MAPS.MAP_OPTIONS
      };

      this.map = new google.maps.Map(mapContainer, mapOptions);
      
      // Initialize directions service and renderer
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false, // Keep garage markers visible
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      this.directionsRenderer.setMap(this.map);
      
      // Add event listeners
      this.map.addListener('click', () => {
        this.closeAllInfoWindows();
      });

      console.log('✅ Map initialized successfully');
      return this.map;

    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      console.log('🎨 Falling back to demo mode for testing');
      
      // Use demo map for testing purposes
      return this.createDemoMap(containerId);
    }
  }

  // Add markers for garages
  addGarageMarkers(garages) {
    if (!this.map || !Array.isArray(garages)) return;

    // Clear existing markers
    this.clearMarkers();

    garages.forEach(garage => {
      if (garage.geo?.lat && garage.geo?.lng) {
        this.addGarageMarker(garage);
      }
    });

    // Fit map to show all markers
    if (this.markers.length > 0) {
      this.fitMapToMarkers();
    }
  }

  // Add individual garage marker
  addGarageMarker(garage) {
    if (!this.map || !garage.geo?.lat || !garage.geo?.lng) return;

    // Create custom marker with better styling
    const marker = new google.maps.Marker({
      position: { lat: garage.geo.lat, lng: garage.geo.lng },
      map: this.map,
      title: garage.garageName,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
              </filter>
            </defs>
            <circle cx="20" cy="20" r="16" fill="#2563eb" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
            <circle cx="20" cy="20" r="12" fill="#3b82f6" opacity="0.8"/>
            <text x="20" y="25" font-family="Arial" font-size="18" fill="white" text-anchor="middle">🔧</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      },
      animation: google.maps.Animation.DROP
    });

    const infoWindow = new google.maps.InfoWindow({
      content: this.createInfoWindowContent(garage)
    });

    marker.addListener('click', () => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
    });

    this.markers.push(marker);
    this.infoWindows.push(infoWindow);
  }

  // Create info window content
  createInfoWindowContent(garage) {
    const rating = garage.rating?.average || 0;
    const ratingStars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    const locationText = typeof garage.location === 'string' ? garage.location : 
                        `${garage.location?.city || ''}, ${garage.location?.state || ''}`;
    
    return `
      <div class="map-popup" style="
        min-width: 280px; 
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        <div style="
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
          padding: 12px 16px;
          margin: -10px -10px 12px -10px;
        ">
          <h4 style="margin: 0; font-size: 16px; font-weight: 600;">
            🏪 ${garage.garageName || 'Unknown Garage'}
          </h4>
          ${garage.isVerified ? '<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">✅ Verified Garage</div>' : ''}
        </div>
        
        <div style="padding: 0 4px;">
          <div style="margin-bottom: 8px;">
            <span style="color: #374151; font-weight: 500;">👤 Owner:</span>
            <span style="color: #6b7280; margin-left: 8px;">${garage.ownerName || 'N/A'}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #374151; font-weight: 500;">📞 Phone:</span>
            <span style="color: #6b7280; margin-left: 8px;">${garage.contactNumber || garage.mobile || 'N/A'}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #374151; font-weight: 500;">📍 Location:</span>
            <span style="color: #6b7280; margin-left: 8px; font-size: 13px;">${locationText || 'N/A'}</span>
          </div>
          
          ${rating > 0 ? `
            <div style="margin-bottom: 8px;">
              <span style="color: #374151; font-weight: 500;">⭐ Rating:</span>
              <span style="color: #f59e0b; margin-left: 8px;">${ratingStars} (${rating.toFixed(1)})</span>
            </div>
          ` : ''}
          
          ${garage.services && garage.services.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <div style="color: #374151; font-weight: 500; margin-bottom: 4px;">🔧 Services:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${garage.services.slice(0, 3).map(service => 
                  `<span style="
                    background: #e5f3ff;
                    color: #2563eb;
                    padding: 2px 6px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                  ">${service}</span>`
                ).join('')}
                ${garage.services.length > 3 ? `<span style="color: #6b7280; font-size: 11px;">+${garage.services.length - 3} more</span>` : ''}
              </div>
            </div>
          ` : ''}
          
          <div style="text-align: center; padding: 8px 0;">
            <button onclick="openBookingPage('${garage._id || garage.id}')" 
                    style="
                      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 6px;
                      cursor: pointer;
                      font-size: 14px;
                      font-weight: 500;
                      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
                      transition: all 0.2s ease;
                    "
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(37, 99, 235, 0.4)';" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(37, 99, 235, 0.3)';">
              📅 Book Service
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Fit map to show all markers
  fitMapToMarkers() {
    if (!this.map || this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(marker => {
      bounds.extend(marker.getPosition());
    });

    if (this.markers.length === 1) {
      this.map.setCenter(bounds.getCenter());
      this.map.setZoom(15);
    } else {
      this.map.fitBounds(bounds);
      this.map.setZoom(Math.min(this.map.getZoom(), 15));
    }
  }

  // Center map on user location
  async centerOnUserLocation() {
    if (!this.map) return;

    try {
      const position = await getCurrentPosition();
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.map.setCenter(userLocation);
      this.map.setZoom(14);

      // Add user location marker
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map: this.map,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24)
        }
      });

      this.userMarker = userMarker;
      console.log('✅ Map centered on user location');

    } catch (error) {
      console.error('❌ Failed to center on user location:', error);
    }
  }

  // Show directions from origin to destination
  showDirections(origin, destination, destinationName = 'Destination') {
    if (!this.map || !this.directionsService || !this.directionsRenderer) {
      console.error('Map or directions service not initialized');
      return;
    }

    const request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    };

    this.directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        // Clear previous directions
        this.directionsRenderer.setDirections(result);
        
        // Show directions info
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Create custom info window with directions summary
        const directionsInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px;">
              <h4 style="margin: 0 0 8px 0; color: #374151;">🗺️ Directions to ${destinationName}</h4>
              <div style="margin-bottom: 4px;">📏 <strong>Distance:</strong> ${leg.distance.text}</div>
              <div style="margin-bottom: 8px;">⏱️ <strong>Duration:</strong> ${leg.duration.text}</div>
              <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                Route via ${route.summary || 'suggested route'}
              </div>
            </div>
          `,
          position: destination
        });
        
        // Show the info window after a short delay
        setTimeout(() => {
          directionsInfoWindow.open(this.map);
        }, 1000);
        
        console.log('✅ Directions displayed successfully');
        console.log(`Distance: ${leg.distance.text}, Duration: ${leg.duration.text}`);
        
      } else {
        console.error('❌ Directions request failed:', status);
        // Show error message
        const errorInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: Arial, sans-serif; color: #dc2626;">
              <h4 style="margin: 0 0 8px 0;">❌ Directions Error</h4>
              <p style="margin: 0;">Unable to calculate directions. Status: ${status}</p>
            </div>
          `,
          position: destination
        });
        errorInfoWindow.open(this.map);
      }
    });
  }

  // Clear directions
  clearDirections() {
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({routes: []});
    }
  }

  // Clear all markers
  clearMarkers() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    this.closeAllInfoWindows();
    this.infoWindows = [];
    
    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = null;
    }
    
    // Also clear directions when clearing markers
    this.clearDirections();
  }

  // Close all info windows
  closeAllInfoWindows() {
    this.infoWindows.forEach(infoWindow => infoWindow.close());
  }

  // Show error message in map container
  showMapError(containerId, message) {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) return;

    mapContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 400px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; flex-direction: column; color: #6b7280; font-family: Arial, sans-serif;">
        <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
        <h3 style="margin: 0 0 8px 0; color: #374151;">Map Demo Mode</h3>
        <p style="margin: 0 0 16px 0; text-align: center; max-width: 400px; line-height: 1.5;">
          Google Maps API is not properly configured, but you can still test the directions feature.<br>
          <strong>Directions will open in external Google Maps.</strong>
        </p>
        <div style="margin-top: 16px; padding: 12px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; max-width: 400px;">
          <p style="margin: 0; font-size: 14px; color: #1565c0;">
            <strong>🌐 Demo Mode Active:</strong><br>
            • Map view shows this placeholder<br>
            • Directions button works (opens Google Maps)<br>
            • All other features work normally
          </p>
        </div>
        <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; max-width: 400px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>To enable integrated maps:</strong><br>
            1. Get a Google Maps API key<br>
            2. Update CONFIG.GOOGLE_MAPS.API_KEY in js/config.js<br>
            3. Reload the page
          </p>
        </div>
      </div>
    `;
  }
  
  // Create a mock map for demo purposes
  createDemoMap(containerId = 'google-map') {
    console.log('🎨 Creating demo map for testing');
    this.showMapError(containerId, 'Demo mode - API key needed for full functionality');
    
    // Mark as available for directions testing
    this.isLoaded = true;
    this.map = { 
      setCenter: () => console.log('Demo: Map centered'),
      setZoom: () => console.log('Demo: Zoom level set')
    };
    
    return Promise.resolve(this.map);
  }

  // Check if maps are available
  isAvailable() {
    return this.isLoaded && this.map !== null;
  }
}

// Global maps manager instance
const mapsManager = new MapsManager();

// Global function for backward compatibility
window.initMap = async function() {
  try {
    await mapsManager.initMap();
    
    // Add current garages if available
    if (window.currentGarages && Array.isArray(window.currentGarages)) {
      mapsManager.addGarageMarkers(window.currentGarages);
    }
  } catch (error) {
    console.error('Map initialization failed:', error);
  }
};

// Helper function to get current position
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const defaultOptions = {
      timeout: CONFIG.GPS?.TIMEOUT || 10000,
      enableHighAccuracy: CONFIG.GPS?.HIGH_ACCURACY || true,
      maximumAge: 60000 // 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { ...defaultOptions, ...options }
    );
  });
}

// Global function to show directions - called from components.js
window.showDirectionsService = function(origin, destination, destinationName) {
  if (window.mapsManager && window.mapsManager.isAvailable()) {
    window.mapsManager.showDirections(origin, destination, destinationName);
  } else {
    console.error('Maps manager not available for directions');
  }
};

// Global callback for direct script loading from HTML
window.initGoogleMapsDirectly = function() {
  console.log('✅ Google Maps loaded directly from HTML script tag');
  mapsManager.isLoaded = true;
  
  // Trigger any waiting initialization
  if (mapsManager.loadingPromise) {
    // Resolve existing loading promise
    mapsManager.loadingPromise = Promise.resolve(true);
  }
  
  console.log('🌐 Google Maps API ready for use');
};

// Make maps manager globally available
window.mapsManager = mapsManager;
