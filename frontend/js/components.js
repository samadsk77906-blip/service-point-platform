// Component creation functions

function createGarageCard(garage) {
  const card = document.createElement('div');
  card.className = 'garage-card';
  
  // Handle different garage data structures
  const name = garage.name || garage.garageName || 'Unknown Garage';
  const rating = garage.rating || garage.rating?.average || 0;
  const reviewCount = garage.reviewCount || garage.rating?.totalReviews || 0;
  const phone = garage.phone || garage.mobile || 'N/A';
  const email = garage.email || 'N/A';
  const city = garage.address?.city || garage.location?.city || 'N/A';
  const district = garage.address?.district || garage.location?.district || '';
  const state = garage.address?.state || garage.location?.state || '';
  const fullAddress = garage.address?.street || garage.location?.address || '';
  const services = garage.services || [];
  const garageId = garage._id || garage.id || 'unknown';
  
  // Create comprehensive location string for directions
  let locationForDirections = name; // Start with garage name
  if (fullAddress) locationForDirections += ', ' + fullAddress;
  if (city && city !== 'N/A') locationForDirections += ', ' + city;
  if (district) locationForDirections += ', ' + district;
  if (state) locationForDirections += ', ' + state;
  
  card.innerHTML = `
    <div class="garage-header">
      <h3>${name}</h3>
      <div class="garage-rating">
        <span class="stars">${'★'.repeat(Math.round(rating))}</span>
        <span class="rating-text">${rating} (${reviewCount})</span>
      </div>
    </div>
    <div class="garage-info">
      <p class="garage-location">
        <i class="fas fa-map-marker-alt"></i>
        <strong>Location:</strong> ${city}${district ? ', ' + district : ''}
      </p>
      <p class="garage-phone">
        <i class="fas fa-phone"></i>
        <strong>Phone:</strong> ${phone}
      </p>
      <p class="garage-email">
        <i class="fas fa-envelope"></i>
        <strong>Email:</strong> ${email}
      </p>
    </div>
    <div class="garage-services">
      <strong>Services:</strong>
      <div class="service-tags">
        ${services.map(service => `<span class="service-tag">${service}</span>`).join('')}
      </div>
    </div>
    <div class="garage-actions">
      <button class="btn btn-primary" onclick="openBookingPage('${garageId}')">
        <i class="fas fa-calendar"></i> Book Service
      </button>
      <button class="btn btn-outline" onclick="openDirections('${garageId}', '${locationForDirections}')">
        <i class="fas fa-directions"></i> Directions
      </button>
    </div>
  `;
  return card;
}

function createBookingCard(booking) {
  const statusClass = {
    pending: 'status-pending',
    confirmed: 'status-confirmed', 
    in_progress: 'status-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled'
  }[booking.status] || 'status-pending';

  const card = document.createElement('div');
  card.className = 'booking-card';
  card.innerHTML = `
    <div class="booking-header">
      <h4>Booking #${booking.bookingId}</h4>
      <span class="booking-status ${statusClass}">${booking.status.replace('_', ' ')}</span>
    </div>
    <div class="booking-info">
      <p><strong>Service:</strong> ${booking.service}</p>
      <p><strong>Garage:</strong> ${booking.garage?.name || 'N/A'}</p>
      <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${booking.scheduledTime}</p>
    </div>
    <div class="booking-actions">
      <button class="btn btn-small btn-outline" onclick="trackBooking('${booking.bookingId}')">
        <i class="fas fa-search"></i> Track
      </button>
    </div>
  `;
  return card;
}

// Modal functions
function showModal(modalId) {
  const modal = qs(`#${modalId}`);
  if (modal) modal.style.display = 'block';
}

function hideModal(modalId) {
  const modal = qs(`#${modalId}`);
  if (modal) modal.style.display = 'none';
}

// Direction functions
function openDirections(garageId, location) {
  console.log(`🗺️ Opening directions for garage: ${garageId} at ${location}`);
  
  // Debug logs
  const mapsAvailable = window.mapsManager ? 'YES' : 'NO';
  const mapsLoaded = window.mapsManager?.isAvailable() ? 'YES' : 'NO';
  
  console.log('🔍 Debug - Maps Manager Available:', mapsAvailable);
  console.log('🔍 Debug - Maps Manager Loaded:', mapsLoaded);
  console.log('🔍 Debug - Google Maps Global:', window.google ? 'YES' : 'NO');
  
  // Show user feedback immediately
  if (typeof showToast === 'function') {
    showToast('Getting directions ready...', 'info');
  }
  
  try {
    // First, always try to switch to map view and initialize if needed
    console.log('🗺️ Attempting to switch to map view...');
    switchToMapViewWithDirections(garageId, location);
    
    if (typeof showToast === 'function') {
      showToast('Preparing directions on map...', 'info');
    }
    
  } catch (error) {
    console.error('❌ Error in directions:', error);
    
    // Fallback: try to open Google Maps search
    console.log('🔄 Falling back to external Google Maps...');
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
    window.open(searchUrl, '_blank');
    
    if (typeof showToast === 'function') {
      showToast('Opening location in external Google Maps...', 'warning');
    }
  }
}

// Function to switch to map view and show directions
function switchToMapViewWithDirections(garageId, location) {
  try {
    console.log('🔄 Switching to map view and preparing directions...');
    
    // Switch to map view first
    const listViewBtn = document.getElementById('list-view-btn');
    const mapViewBtn = document.getElementById('map-view-btn');
    const listView = document.getElementById('list-view');
    const mapView = document.getElementById('map-view');
    
    if (listViewBtn && mapViewBtn && listView && mapView) {
      console.log('✅ Switching UI to map view');
      // Update button states
      listViewBtn.classList.remove('active');
      mapViewBtn.classList.add('active');
      
      // Show map view, hide list view
      listView.classList.add('hidden');
      mapView.classList.remove('hidden');
    } else {
      console.warn('⚠️ Map view elements not found');
    }
    
    // Force map initialization and directions
    const initializeAndShowDirections = async () => {
      try {
        console.log('🏁 Starting map initialization process...');
        
        // Ensure maps manager exists
        if (!window.mapsManager) {
          throw new Error('Maps manager not available');
        }
        
        // Initialize map if not already done (including demo mode)
        if (!window.mapsManager.isAvailable()) {
          console.log('🗺️ Initializing Maps (with demo fallback)...');
          await window.mapsManager.initMap();
          
          // Give the map a moment to fully load
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Check if we have a real Google Maps or demo mode
        if (window.google && window.google.maps) {
          console.log('🧭 Showing directions on integrated Google Maps...');
          showDirectionsOnMap(garageId, location);
        } else {
          console.log('🎨 Demo mode - opening external directions...');
          openExternalDirections(location);
          
          if (typeof showToast === 'function') {
            showToast('Demo mode: Opening directions in Google Maps', 'info');
          }
        }
        
      } catch (mapError) {
        console.error('❌ Failed to initialize map or show directions:', mapError);
        // Fallback to opening Google Maps externally
        openExternalDirections(location);
      }
    };
    
    // Execute the initialization
    initializeAndShowDirections();
    
    // Scroll to map section
    setTimeout(() => {
      const mapSection = document.querySelector('.search-results');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Error switching to map view:', error);
    // Fallback to external directions
    openExternalDirections(location);
  }
}

// Function to show directions on the integrated map
function showDirectionsOnMap(garageId, location) {
  try {
    console.log('🔍 Debug - Garage ID:', garageId);
    console.log('🔍 Debug - Location:', location);
    console.log('🔍 Debug - Current Garages:', window.currentGarages);
    
    // Find the garage in current results
    const targetGarage = window.currentGarages?.find(garage => 
      (garage._id === garageId || garage.id === garageId)
    );
    
    console.log('🔍 Debug - Target Garage Found:', targetGarage);
    
    if (targetGarage) {
      console.log('🔍 Debug - Garage Geo Data:', targetGarage.geo);
      
      if (targetGarage.geo?.lat && targetGarage.geo?.lng) {
        // Center map on the garage location
        const garageLocation = {
          lat: targetGarage.geo.lat,
          lng: targetGarage.geo.lng
        };
        
        console.log('✅ Using garage coordinates:', garageLocation);
        window.mapsManager.map.setCenter(garageLocation);
        window.mapsManager.map.setZoom(16);
        
        // Get user's current location for directions
        if (navigator.geolocation) {
          console.log('📍 Getting user location for directions...');
          navigator.geolocation.getCurrentPosition((position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            console.log('✅ User location obtained:', userLocation);
            // Show directions using Google Maps DirectionsService
            showDirectionsService(userLocation, garageLocation, targetGarage.name || targetGarage.garageName);
            
          }, (geoError) => {
            console.log('⚠️ Could not get user location for directions:', geoError);
            // Just highlight the garage marker without directions
            highlightGarageMarker(targetGarage);
            
            if (typeof showToast === 'function') {
              showToast('Location access denied. Showing garage location only.', 'warning');
            }
          }, {
            timeout: 10000,
            enableHighAccuracy: true
          });
        } else {
          console.log('⚠️ Geolocation not supported - just highlighting garage');
          // Just highlight the garage marker without directions
          highlightGarageMarker(targetGarage);
          
          if (typeof showToast === 'function') {
            showToast('Geolocation not supported. Showing garage location only.', 'info');
          }
        }
        
      } else {
        console.log('❌ Garage coordinates not available - trying geocoding with address');
        // Try to geocode the location string
        geocodeAndShowDirections(location, targetGarage);
      }
    } else {
      console.log('❌ Target garage not found in current results - trying geocoding');
      geocodeAndShowDirections(location, null);
    }
    
  } catch (error) {
    console.error('❌ Error showing directions on map:', error);
    openExternalDirections(location);
  }
}

// Function to highlight a specific garage marker
function highlightGarageMarker(garage) {
  // Find the marker for this garage and open its info window
  const markers = window.mapsManager.markers;
  const infoWindows = window.mapsManager.infoWindows;
  
  markers.forEach((marker, index) => {
    if (marker.getTitle() === (garage.name || garage.garageName)) {
      // Close other info windows and open this one
      window.mapsManager.closeAllInfoWindows();
      if (infoWindows[index]) {
        infoWindows[index].open(window.mapsManager.map, marker);
      }
    }
  });
}

// Function to geocode location and show directions
function geocodeAndShowDirections(location, garage) {
  console.log('🌍 Geocoding location:', location);
  
  if (!window.google?.maps?.Geocoder) {
    console.error('❌ Google Maps Geocoder not available');
    openExternalDirections(location);
    return;
  }
  
  const geocoder = new google.maps.Geocoder();
  
  geocoder.geocode({ address: location }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const geocodedLocation = results[0].geometry.location;
      const garageLocation = {
        lat: geocodedLocation.lat(),
        lng: geocodedLocation.lng()
      };
      
      console.log('✅ Geocoded location:', garageLocation);
      
      // Center map on the geocoded location
      window.mapsManager.map.setCenter(garageLocation);
      window.mapsManager.map.setZoom(16);
      
      // Add a marker for the geocoded location if no garage marker exists
      if (!garage) {
        const marker = new google.maps.Marker({
          position: garageLocation,
          map: window.mapsManager.map,
          title: location,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="16" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
                <circle cx="20" cy="20" r="8" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });
      }
      
      // Get user location for directions
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Show directions
          showDirectionsService(userLocation, garageLocation, garage?.name || garage?.garageName || location);
          
        }, (error) => {
          console.log('⚠️ Could not get user location:', error);
          
          if (typeof showToast === 'function') {
            showToast('Location centered on map. Enable location for directions.', 'info');
          }
        });
      }
      
    } else {
      console.error('❌ Geocoding failed:', status);
      openExternalDirections(location);
    }
  });
}

// Function to open external directions as fallback
function openExternalDirections(location) {
  console.log('🔗 Opening external Google Maps for:', location);
  const destination = encodeURIComponent(location);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  window.open(googleMapsUrl, '_blank');
  
  if (typeof showToast === 'function') {
    showToast('Opened external Google Maps for directions', 'info');
  }
}

// Enhanced directions function that can use garage coordinates if available
async function openDirectionsEnhanced(garageId, location) {
  console.log(`🗺️ Opening enhanced directions for garage: ${garageId}`);
  
  try {
    // Try to get garage details for precise coordinates
    const response = await garageAPI.getById(garageId);
    const garage = response.data.garage;
    
    if (garage.location && garage.location.coordinates) {
      // Use precise coordinates if available
      const [lng, lat] = garage.location.coordinates;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(googleMapsUrl, '_blank');
    } else {
      // Fallback to address-based directions
      openDirections(garageId, location);
    }
    
    if (typeof showToast === 'function') {
      showToast('Opening precise directions in Google Maps...', 'success');
    }
    
  } catch (error) {
    console.error('Error getting garage coordinates:', error);
    // Fallback to basic directions
    openDirections(garageId, location);
  }
}

function openBookingPage(garageId, service = '') {
  const params = new URLSearchParams({ garageId });
  if (service) params.set('service', service);
  window.location.href = `booking.html?${params.toString()}`;
}
