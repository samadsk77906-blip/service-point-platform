// Global state
let currentGarages = [];
let currentFilters = {};

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  loadAllGaragesForMap(); // Load garages for map display
  // loadLocationData(); // DISABLED - Using location-simple.js instead
});

function initializeApp() {
  // Hide loading spinner after a short delay
  setTimeout(() => {
    const spinner = qs('#loading-spinner');
    if (spinner) spinner.classList.add('hidden');
  }, 1000);
}

function setupEventListeners() {
  // Navigation toggle for mobile
  const navToggle = qs('.nav-toggle');
  const navMenu = qs('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
    });
  }

  // Location dropdowns - DISABLED - Using location-simple.js instead
  // const countrySelect = qs('#country-select');
  // const stateSelect = qs('#state-select');
  // const citySelect = qs('#city-select');
  // const districtSelect = qs('#district-select');

  // if (countrySelect) countrySelect.addEventListener('change', onCountryChange);
  // if (stateSelect) stateSelect.addEventListener('change', onStateChange);
  // if (citySelect) citySelect.addEventListener('change', onCityChange);

  // Search and GPS buttons
  const searchBtn = qs('#search-btn');
  const gpsBtn = qs('#gps-btn');
  
  if (searchBtn) searchBtn.addEventListener('click', performSearch);
  if (gpsBtn) gpsBtn.addEventListener('click', useGPS);

  // View toggle buttons
  const listViewBtn = qs('#list-view-btn');
  const mapViewBtn = qs('#map-view-btn');
  
  if (listViewBtn) listViewBtn.addEventListener('click', () => toggleView('list'));
  if (mapViewBtn) mapViewBtn.addEventListener('click', () => toggleView('map'));

  // Service cards
  const serviceCards = qsa('.service-card');
  serviceCards.forEach(card => {
    const btn = card.querySelector('.btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const service = card.dataset.service;
        if (service) {
          // Set service filter and trigger search
          const serviceFilter = qs('#service-filter');
          if (serviceFilter) serviceFilter.value = service;
          performSearch();
          scrollToSection('garage-search');
        }
      });
    }
  });

  // Modal close
  const modalClose = qs('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => hideModal('garage-modal'));
  }

  // Click outside modal to close
  const modal = qs('#garage-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal('garage-modal');
    });
  }
}

// Location loading and filtering
async function loadLocationData() {
  try {
    const response = await garageAPI.getLocations();
    const locations = response.data;
    
    populateSelect('#country-select', locations.countries);
  } catch (error) {
    console.error('Failed to load locations:', error);
  }
}

function populateSelect(selector, options) {
  const select = qs(selector);
  if (!select || !options) return;

  // Clear existing options except the first one
  const firstOption = select.firstElementChild;
  select.innerHTML = '';
  if (firstOption) select.appendChild(firstOption);

  options.forEach(option => {
    const optionEl = document.createElement('option');
    optionEl.value = option;
    optionEl.textContent = option;
    select.appendChild(optionEl);
  });
}

async function onCountryChange() {
  const country = qs('#country-select').value;
  const stateSelect = qs('#state-select');
  const citySelect = qs('#city-select');
  const districtSelect = qs('#district-select');

  // Reset and disable dependent selects
  [stateSelect, citySelect, districtSelect].forEach(select => {
    if (select) {
      select.innerHTML = '<option value="">Select...</option>';
      select.disabled = true;
    }
  });

  if (!country) return;

  try {
    const response = await garageAPI.getLocations(toQuery({ country }));
    populateSelect('#state-select', response.data.states);
    if (stateSelect) stateSelect.disabled = false;
  } catch (error) {
    console.error('Failed to load states:', error);
  }
}

async function onStateChange() {
  const country = qs('#country-select').value;
  const state = qs('#state-select').value;
  const citySelect = qs('#city-select');
  const districtSelect = qs('#district-select');

  // Reset dependent selects
  [citySelect, districtSelect].forEach(select => {
    if (select) {
      select.innerHTML = '<option value="">Select...</option>';
      select.disabled = true;
    }
  });

  if (!state) return;

  try {
    const response = await garageAPI.getLocations(toQuery({ country, state }));
    populateSelect('#city-select', response.data.cities);
    if (citySelect) citySelect.disabled = false;
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

async function onCityChange() {
  const country = qs('#country-select').value;
  const state = qs('#state-select').value;
  const city = qs('#city-select').value;
  const districtSelect = qs('#district-select');

  if (districtSelect) {
    districtSelect.innerHTML = '<option value="">Select...</option>';
    districtSelect.disabled = true;
  }

  if (!city) return;

  try {
    const response = await garageAPI.getLocations(toQuery({ country, state, city }));
    populateSelect('#district-select', response.data.districts);
    if (districtSelect) districtSelect.disabled = false;
  } catch (error) {
    console.error('Failed to load districts:', error);
  }
}

// Search functionality
async function performSearch() {
  const filters = {
    country: qs('#country-select')?.value,
    state: qs('#state-select')?.value,
    city: qs('#city-select')?.value,
    district: qs('#district-select')?.value,
    service: qs('#service-filter')?.value,
  };

  currentFilters = filters;
  
  // Show loading state
  const searchBtn = qs('#search-btn');
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
  }

  try {
    console.log('Searching with filters:', filters);
    
    // Use the location-based garage search API
    const queryParams = new URLSearchParams();
    if (filters.state) queryParams.append('state', filters.state);
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.district) queryParams.append('district', filters.district);
    if (filters.service) queryParams.append('service', filters.service);
    
    const queryString = queryParams.toString();
    const url = `${ENDPOINTS.garageSearchByLocation()}${queryString ? '?' + queryString : ''}`;
    
    const response = await api.get(url);
    currentGarages = response.data || [];
    
    console.log('Search results:', {
      count: currentGarages.length,
      garages: currentGarages.slice(0, 3) // Log first 3 results
    });
    
    displayGarages();
    
    if (currentGarages.length > 0) {
      showToast(`Found ${currentGarages.length} garage${currentGarages.length !== 1 ? 's' : ''}!`, 'success');
    }
    
  } catch (error) {
    console.error('Search failed:', error);
    showToast('Search failed. Please try again.', 'error');
  } finally {
    // Reset search button
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
    }
  }
}

function displayGarages() {
  const container = qs('#garage-cards');
  const noResults = qs('#no-results');
  
  if (!container || !noResults) return;

  container.innerHTML = '';

  if (currentGarages.length === 0) {
    hide(container.parentElement);
    show(noResults);
    
    // Clear map markers if no results
    if (window.mapsManager && mapsManager.isAvailable()) {
      mapsManager.clearMarkers();
    }
    return;
  }

  hide(noResults);
  show(container.parentElement);

  currentGarages.forEach(garage => {
    const card = createGarageCard(garage);
    container.appendChild(card);
  });
  
  // Update map with current garages if map is available and visible
  if (window.mapsManager && mapsManager.isAvailable()) {
    mapsManager.addGarageMarkers(currentGarages);
  }
}

// GPS functionality with improved error handling
async function useGPS() {
  if (!navigator.geolocation) {
    showToast('GPS is not supported by this browser', 'error');
    return;
  }

  const gpsBtn = qs('#gps-btn');
  if (gpsBtn) {
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
  }

  try {
    // Use the centralized getCurrentPosition function
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    
    console.log('GPS coordinates obtained:', { latitude, longitude });
    
    // Search for nearby garages using the location API
    const response = await api.post(ENDPOINTS.garageNearby(), {
      latitude: latitude,
      longitude: longitude,
      maxDistance: CONFIG.GPS?.DEFAULT_RADIUS || 50,
      service: qs('#service-filter')?.value || null
    });
    
    currentGarages = response.data || [];
    displayGarages();
    
    // Also update map if available
    if (window.mapsManager && window.mapsManager.isAvailable()) {
      mapsManager.addGarageMarkers(currentGarages);
      mapsManager.centerOnUserLocation();
    }
    
    showToast(`Found ${currentGarages.length} nearby garage${currentGarages.length !== 1 ? 's' : ''}!`, 'success');

  } catch (error) {
    console.error('GPS error:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Unable to get your location';
    if (error.code === 1) {
      errorMessage = 'Location access denied. Please enable location permissions.';
    } else if (error.code === 2) {
      errorMessage = 'Location unavailable. Please check your GPS settings.';
    } else if (error.code === 3) {
      errorMessage = 'Location request timed out. Please try again.';
    }
    
    showToast(errorMessage, 'error');
  } finally {
    if (gpsBtn) {
      gpsBtn.disabled = false;
      gpsBtn.innerHTML = '<i class="fas fa-location-dot"></i> Use GPS';
    }
  }
}

// View toggle with improved map handling
function toggleView(view) {
  const listView = qs('#list-view');
  const mapView = qs('#map-view');
  const listBtn = qs('#list-view-btn');
  const mapBtn = qs('#map-view-btn');

  if (view === 'list') {
    show(listView);
    hide(mapView);
    listBtn?.classList.add('active');
    mapBtn?.classList.remove('active');
  } else {
    hide(listView);
    show(mapView);
    mapBtn?.classList.add('active');
    listBtn?.classList.remove('active');
    
    // Initialize map using the new maps manager
    initializeMapView();
  }
}

// Initialize map view with current garages
async function initializeMapView() {
  try {
    // Check if maps manager is available
    if (!window.mapsManager) {
      console.warn('Maps manager not available');
      return;
    }
    
    // Initialize map if not already done
    if (!mapsManager.isAvailable()) {
      await mapsManager.initMap();
    }
    
    // Priority: Show current search results if available, otherwise show all garages
    if (currentGarages && Array.isArray(currentGarages) && currentGarages.length > 0) {
      console.log('📍 Displaying search results on map:', currentGarages.length);
      mapsManager.addGarageMarkers(currentGarages);
    } else if (window.allMapGarages && Array.isArray(window.allMapGarages)) {
      console.log('🗺️ Displaying all garages on map:', window.allMapGarages.length);
      addGarageMarkersToMap(window.allMapGarages);
    } else {
      // Load all garages if not already loaded
      console.log('⏳ Loading garages for map display...');
      const garages = await loadAllGaragesForMap();
      if (garages.length > 0) {
        addGarageMarkersToMap(garages);
      }
    }
    
  } catch (error) {
    console.error('Failed to initialize map view:', error);
  }
}

// Google Maps integration now handled by maps.js

// Load all garages for initial map display
async function loadAllGaragesForMap() {
  try {
    console.log('🗺️ Loading all garages for map display...');
    
    const response = await api.get(ENDPOINTS.garageMapLocations());
    const allGarages = response.data.garages || [];
    
    console.log('📍 Loaded garages for map:', {
      total: allGarages.length,
      withCoordinates: allGarages.filter(g => g.geo && g.geo.coordinates).length
    });
    
    // Store globally for map access
    window.allMapGarages = allGarages;
    
    // If map is already initialized, add markers
    if (window.mapsManager && mapsManager.isAvailable()) {
      addGarageMarkersToMap(allGarages);
    }
    
    return allGarages;
    
  } catch (error) {
    console.error('❌ Failed to load garages for map:', error);
    return [];
  }
}

// Add garage markers to map with proper coordinate handling
function addGarageMarkersToMap(garages) {
  if (!window.mapsManager || !mapsManager.isAvailable()) {
    console.log('⚠️ Map not available, skipping marker placement');
    return;
  }
  
  // Convert garage coordinates to map format
  const mapGarages = garages.map(garage => {
    // Handle different coordinate formats
    let lat, lng;
    
    if (garage.geo && garage.geo.coordinates && Array.isArray(garage.geo.coordinates)) {
      // GeoJSON format [longitude, latitude]
      lng = garage.geo.coordinates[0];
      lat = garage.geo.coordinates[1];
    } else if (garage.geo && garage.geo.latitude && garage.geo.longitude) {
      // Direct lat/lng format
      lat = garage.geo.latitude;
      lng = garage.geo.longitude;
    } else {
      // Skip garages without coordinates
      return null;
    }
    
    return {
      ...garage,
      geo: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      }
    };
  }).filter(garage => garage !== null && garage.geo.lat && garage.geo.lng);
  
  console.log('📌 Adding markers for garages:', mapGarages.length);
  
  // Add markers to map
  mapsManager.addGarageMarkers(mapGarages);
}

// Make functions globally available
window.scrollToSection = scrollToSection;
window.showGarageDetails = showGarageDetails;
window.openBookingPage = openBookingPage;
window.loadAllGaragesForMap = loadAllGaragesForMap;
window.addGarageMarkersToMap = addGarageMarkersToMap;
