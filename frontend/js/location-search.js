// Enhanced Location Search with Cascading Dropdowns and GPS functionality
class LocationSearch {
    constructor() {
        this.apiBaseUrl = '/api';
        this.userLocation = null;
        this.initializeElements();
        this.setupEventListeners();
        this.loadCountries();
    }

    initializeElements() {
        // Dropdown elements
        this.countrySelect = document.getElementById('country-select');
        this.stateSelect = document.getElementById('state-select');
        this.citySelect = document.getElementById('city-select');
        this.districtSelect = document.getElementById('district-select');
        this.serviceFilter = document.getElementById('service-filter');

        // Action buttons
        this.gpsButton = document.getElementById('gps-btn');
        this.searchButton = document.getElementById('search-btn');

        // Results elements
        this.garageCards = document.getElementById('garage-cards');
        this.noResults = document.getElementById('no-results');

        // Loading spinner
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Debug element existence
        console.log('Element initialization:');
        console.log('Country select found:', !!this.countrySelect);
        console.log('State select found:', !!this.stateSelect);
        console.log('City select found:', !!this.citySelect);
        console.log('District select found:', !!this.districtSelect);
    }

    setupEventListeners() {
        // Dropdown change events
        this.countrySelect?.addEventListener('change', () => this.handleCountryChange());
        this.stateSelect?.addEventListener('change', () => this.handleStateChange());
        this.citySelect?.addEventListener('change', () => this.handleCityChange());
        this.districtSelect?.addEventListener('change', () => this.handleDistrictChange());

        // Button click events
        this.gpsButton?.addEventListener('click', () => this.handleGpsClick());
        this.searchButton?.addEventListener('click', () => this.handleSearchClick());
    }

    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    showMessage(message, type = 'info') {
        // Create a message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        messageDiv.style.backgroundColor = colors[type] || colors.info;
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 5000);
    }

    async loadCountries() {
        try {
            console.log('Loading countries...');
            const response = await fetch(`${this.apiBaseUrl}/location/countries`);
            const data = await response.json();
            console.log('Countries response:', data);

            if (data.success) {
                this.populateDropdown(this.countrySelect, data.data, 'Select Country');
                this.enableDropdown(this.countrySelect);
                console.log('Countries loaded:', data.data.length);
                
                // Auto-select India and load states
                setTimeout(() => {
                    this.countrySelect.value = 'India';
                    this.handleCountryChange();
                }, 100);
            } else {
                console.error('Countries API returned unsuccessful response:', data);
            }
        } catch (error) {
            console.error('Error loading countries:', error);
            this.showMessage('Error loading countries', 'error');
        }
    }

    async handleCountryChange() {
        const country = this.countrySelect?.value;
        console.log('Country changed to:', country);
        
        // Reset dependent dropdowns
        this.resetDropdown(this.stateSelect, 'Select State');
        this.resetDropdown(this.citySelect, 'Select City');
        this.resetDropdown(this.districtSelect, 'Select District');

        if (country && country.trim()) {
            console.log('Loading states for country:', country);
            await this.loadStates(country);
        } else {
            console.log('No country selected');
        }
    }
    async loadStates(country) {
        try {
            let url = `${this.apiBaseUrl}/location/states`;
            if (country && country !== 'India') {
                url += `/${encodeURIComponent(country)}`;
            }
            
            console.log('Loading states for country:', country, 'URL:', url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                if (data.data.length > 0) {
                    this.populateDropdown(this.stateSelect, data.data, 'Select State');
                    this.enableDropdown(this.stateSelect);
                } else {
                    this.resetDropdown(this.stateSelect, 'No states available');
                    this.showMessage(data.message || `No states available for ${country}`, 'info');
                }
            } else {
                this.resetDropdown(this.stateSelect, 'No states available');
            }
        } catch (error) {
            console.error('Error loading states:', error);
            this.showMessage('Error loading states', 'error');
        }
    }

    async handleStateChange() {
        const state = this.stateSelect?.value;
        console.log('State changed to:', state);
        
        // Reset dependent dropdowns
        this.resetDropdown(this.citySelect, 'Select City');
        this.resetDropdown(this.districtSelect, 'Select District');

        if (state) {
            console.log('Loading cities for state:', state);
            await this.loadCities(state);
        } else {
            console.log('No state selected, disabling city dropdown');
        }
    }

    async loadCities(state) {
        try {
            const url = `${this.apiBaseUrl}/location/cities/${encodeURIComponent(state)}`;
            console.log('Fetching cities from:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            console.log('Cities response for', state, ':', data);

            if (data.success && data.data) {
                console.log('Populating cities dropdown with:', data.data.length, 'cities');
                this.populateDropdown(this.citySelect, data.data, 'Select City');
                this.enableDropdown(this.citySelect);
                console.log('City dropdown enabled');
            } else {
                console.error('Cities API returned unsuccessful response:', data);
                this.showMessage('No cities found for selected state', 'warning');
            }
        } catch (error) {
            console.error('Error loading cities:', error);
            this.showMessage('Error loading cities', 'error');
        }
    }

    async handleCityChange() {
        const state = this.stateSelect?.value;
        const city = this.citySelect?.value;
        
        // Reset dependent dropdown
        this.resetDropdown(this.districtSelect, 'Select District');

        if (state && city) {
            await this.loadDistricts(state, city);
        }
    }

    async loadDistricts(state, city) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/location/districts/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
            const data = await response.json();

            if (data.success) {
                this.populateDropdown(this.districtSelect, data.data, 'Select District');
                this.enableDropdown(this.districtSelect);
            }
        } catch (error) {
            console.error('Error loading districts:', error);
            this.showMessage('Error loading districts', 'error');
        }
    }

    handleDistrictChange() {
        // Auto-search when district is selected
        if (this.districtSelect?.value) {
            this.handleSearchClick();
        }
    }

    async handleGpsClick() {
        if (!navigator.geolocation) {
            this.showMessage('Geolocation is not supported by this browser', 'error');
            return;
        }

        // Update button state
        this.updateGpsButton('loading');

        const options = {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout
            maximumAge: 600000 // 10 minutes cache
        };

        console.log('Requesting GPS location with options:', options);

        navigator.geolocation.getCurrentPosition(
            (position) => this.handleGpsSuccess(position),
            (error) => this.handleGpsError(error),
            options
        );
    }

    async handleGpsSuccess(position) {
        this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };

        this.updateGpsButton('success');
        this.showMessage(`Location found: ${this.userLocation.latitude.toFixed(6)}, ${this.userLocation.longitude.toFixed(6)}`, 'success');
        
        // Search for nearby garages
        await this.searchNearbyGarages();
    }

    handleGpsError(error) {
        let errorMsg = 'Unable to get your location. ';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMsg += 'Please enable location permissions in your browser settings. You may need to refresh the page after enabling permissions.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMsg += 'Location information is unavailable. This might be due to network issues or GPS being disabled.';
                break;
            case error.TIMEOUT:
                errorMsg += 'Location request timed out. Please try again or check your internet connection.';
                break;
            default:
                errorMsg += 'An unknown error occurred. Please try refreshing the page.';
        }
        
        console.error('GPS Error:', error);
        this.showMessage(errorMsg, 'error');
        this.updateGpsButton('default');
    }

    updateGpsButton(state) {
        if (!this.gpsButton) return;

        const states = {
            default: {
                html: '<i class="fas fa-location-dot"></i> Use GPS',
                disabled: false,
                class: 'btn-gps'
            },
            loading: {
                html: '<i class="fas fa-spinner fa-spin"></i> Getting Location...',
                disabled: true,
                class: 'btn-gps loading'
            },
            success: {
                html: '<i class="fas fa-check"></i> Location Found',
                disabled: false,
                class: 'btn-gps success'
            }
        };

        const buttonState = states[state];
        this.gpsButton.innerHTML = buttonState.html;
        this.gpsButton.disabled = buttonState.disabled;
        this.gpsButton.className = `btn ${buttonState.class}`;
    }

    async handleSearchClick() {
        const state = this.stateSelect?.value;
        const city = this.citySelect?.value;
        const district = this.districtSelect?.value;
        const service = this.serviceFilter?.value;

        if (!state && !this.userLocation) {
            this.showMessage('Please select a state or use GPS to find nearby garages', 'warning');
            return;
        }

        if (this.userLocation) {
            await this.searchNearbyGarages();
        } else {
            await this.searchByLocation(state, city, district, service);
        }
    }

    async searchByLocation(state, city, district, service) {
        try {
            this.showLoading();
            
            const params = new URLSearchParams();
            if (state) params.append('state', state);
            if (city) params.append('city', city);
            if (district) params.append('district', district);
            if (service) params.append('service', service);

            const response = await fetch(`${this.apiBaseUrl}/location/garages/search?${params}`);
            const data = await response.json();

            if (data.success) {
                this.displayGarages(data.data);
                this.showMessage(`Found ${data.count} garages`, 'success');
            } else {
                this.displayGarages([]);
                this.showMessage(data.message || 'No garages found', 'info');
            }
        } catch (error) {
            console.error('Error searching garages:', error);
            this.showMessage('Error searching garages', 'error');
            this.displayGarages([]);
        } finally {
            this.hideLoading();
        }
    }

    async searchNearbyGarages() {
        if (!this.userLocation) {
            this.showMessage('GPS location not available', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const requestBody = {
                latitude: this.userLocation.latitude,
                longitude: this.userLocation.longitude,
                maxDistance: 50,
                service: this.serviceFilter?.value || null
            };

            const response = await fetch(`${this.apiBaseUrl}/location/garages/nearby`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                this.displayGarages(data.data);
                this.showMessage(`Found ${data.count} nearby garages`, 'success');
            } else {
                this.displayGarages([]);
                this.showMessage(data.message || 'No nearby garages found', 'info');
            }
        } catch (error) {
            console.error('Error searching nearby garages:', error);
            this.showMessage('Error searching nearby garages', 'error');
            this.displayGarages([]);
        } finally {
            this.hideLoading();
        }
    }

    displayGarages(garages) {
        if (!this.garageCards) return;

        // Clear existing results
        this.garageCards.innerHTML = '';
        
        if (garages.length === 0) {
            this.showNoResults();
            return;
        }

        this.hideNoResults();

        garages.forEach(garage => {
            const garageCard = this.createGarageCard(garage);
            this.garageCards.appendChild(garageCard);
        });
    }

    createGarageCard(garage) {
        const card = document.createElement('div');
        card.className = 'garage-card';
        
        const distanceText = garage.distance ? 
            `<div class="garage-distance">📍 ${garage.distance.toFixed(1)} km away</div>` : '';
        
        const servicesText = garage.services && garage.services.length > 0 ? 
            garage.services.slice(0, 3).join(', ') + (garage.services.length > 3 ? '...' : '') :
            'General Services';

        const ratingStars = this.generateStars(garage.rating || 0);
        
        // Prepare garage location for directions
        const garageLocation = garage.location || `${garage.locationHierarchy?.city || ''}, ${garage.locationHierarchy?.state || ''}`;
        const garageId = garage._id || garage.garageId;

        card.innerHTML = `
            <div class="garage-header">
                <h3 class="garage-name">🔧 ${garage.garageName || garage.name || 'Garage'}</h3>
                <div class="garage-rating">
                    ${ratingStars}
                    <span class="rating-text">(${garage.totalRatings || 0})</span>
                </div>
            </div>
            <div class="garage-details">
                <p class="garage-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${garageLocation}
                </p>
                <p class="garage-contact">
                    <i class="fas fa-phone"></i> ${garage.contactNumber || 'N/A'}
                </p>
                <p class="garage-services">
                    <i class="fas fa-tools"></i> ${servicesText}
                </p>
                ${distanceText}
            </div>
            <div class="garage-actions">
                <div class="action-buttons">
                    <button class="btn btn-primary btn-book" onclick="bookGarage('${garageId}')">
                        <i class="fas fa-calendar-plus"></i> Book Now
                    </button>
                    <button class="btn btn-secondary btn-directions" 
                            onclick="showDirections('${garageLocation}', '${garage.garageName || garage.name || 'Garage'}', ${garage.coordinates?.latitude || garage.latitude || 'null'}, ${garage.coordinates?.longitude || garage.longitude || 'null'})">
                        <i class="fas fa-route"></i> Directions
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    showNoResults() {
        if (this.noResults) {
            this.noResults.classList.remove('hidden');
        }
    }

    hideNoResults() {
        if (this.noResults) {
            this.noResults.classList.add('hidden');
        }
    }

    populateDropdown(dropdown, options, placeholder) {
        if (!dropdown) {
            console.error('Dropdown element not found for:', placeholder);
            return;
        }

        console.log(`Populating dropdown (${placeholder}) with:`, options);
        dropdown.innerHTML = ``;
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = placeholder;
        dropdown.appendChild(defaultOption);
        
        if (options && options.length > 0) {
            options.forEach(option => {
                const optionElement = document.createElement('option');
                // Use name for value to keep it simple and consistent
                optionElement.value = option.name;
                optionElement.textContent = option.name;
                
                // Auto-select India for country dropdown
                if (dropdown.id === 'country-select' && option.name === 'India') {
                    optionElement.selected = true;
                }
                
                dropdown.appendChild(optionElement);
                console.log(`Added option: ${option.name}`);
            });
            console.log(`Successfully populated ${options.length} options in dropdown`);
        } else {
            console.warn('No options provided for dropdown:', placeholder);
        }
    }

    resetDropdown(dropdown, placeholder) {
        if (!dropdown) return;
        
        dropdown.innerHTML = `<option value="">${placeholder}</option>`;
        this.disableDropdown(dropdown);
    }

    enableDropdown(dropdown) {
        if (dropdown) {
            dropdown.disabled = false;
        }
    }

    disableDropdown(dropdown) {
        if (dropdown) {
            dropdown.disabled = true;
        }
    }
}

// Global functions for garage actions
window.bookGarage = function(garageId) {
    // Navigate to booking page with garage ID
    window.location.href = `booking.html?garageId=${garageId}`;
};

// Function to show directions to garage
window.showDirections = function(garageLocation, garageName, latitude, longitude) {
    console.log('Opening directions for:', garageName, 'at:', garageLocation);
    
    // Show modal with direction options
    showDirectionsModal(garageLocation, garageName, latitude, longitude);
};

// Function to show directions modal
function showDirectionsModal(garageLocation, garageName, latitude, longitude) {
    // Remove existing modal if any
    const existingModal = document.getElementById('directions-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'directions-modal';
    modal.className = 'directions-modal';
    
    // Prepare URLs for different map applications
    const encodedLocation = encodeURIComponent(garageLocation);
    const encodedName = encodeURIComponent(garageName);
    
    // Use coordinates if available, otherwise use address
    let googleMapsUrl, appleMapsUrl, wazeUrl;
    
    if (latitude && longitude && latitude !== 'null' && longitude !== 'null') {
        // Use coordinates for more accurate directions
        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=&travelmode=driving`;
        appleMapsUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
        wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    } else {
        // Fallback to address-based directions
        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}&travelmode=driving`;
        appleMapsUrl = `http://maps.apple.com/?daddr=${encodedLocation}&dirflg=d`;
        wazeUrl = `https://waze.com/ul?q=${encodedLocation}&navigate=yes`;
    }
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeDirectionsModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-route"></i> Get Directions</h3>
                <button class="modal-close" onclick="closeDirectionsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="garage-info">
                    <h4>${garageName}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${garageLocation}</p>
                </div>
                <div class="directions-options">
                    <h5>Choose your preferred map application:</h5>
                    <div class="map-buttons">
                        <a href="${googleMapsUrl}" target="_blank" class="btn btn-map google-maps">
                            <i class="fab fa-google"></i> Google Maps
                        </a>
                        <a href="${appleMapsUrl}" target="_blank" class="btn btn-map apple-maps">
                            <i class="fab fa-apple"></i> Apple Maps
                        </a>
                        <a href="${wazeUrl}" target="_blank" class="btn btn-map waze">
                            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E" alt="Waze" style="width: 16px; height: 16px; margin-right: 8px;"> Waze
                        </a>
                    </div>
                </div>
                <div class="additional-info">
                    <p><i class="fas fa-info-circle"></i> Clicking on any option will open the respective map application with directions to the garage.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Function to close directions modal
window.closeDirectionsModal = function() {
    const modal = document.getElementById('directions-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
};


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing LocationSearch');
    window.locationSearch = new LocationSearch();
    
    // Additional check in case the dropdowns already have values
    setTimeout(() => {
        const stateSelect = document.getElementById('state-select');
        if (stateSelect && stateSelect.value) {
            console.log('State already has value:', stateSelect.value);
            window.locationSearch.handleStateChange();
        }
    }, 500);
});

// Add CSS animations and styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Garage card action buttons styling */
    .action-buttons {
        display: flex;
        gap: 8px;
        width: 100%;
    }
    
    .btn-book {
        flex: 2;
        min-width: 0;
    }
    
    .btn-directions {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
    }
    
    /* Directions Modal Styles */
    .directions-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .directions-modal.show {
        opacity: 1;
        visibility: visible;
    }
    
    .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }
    
    .modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        transition: transform 0.3s ease;
    }
    
    .directions-modal:not(.show) .modal-content {
        transform: translate(-50%, -50%) scale(0.9);
    }
    
    .modal-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
    }
    
    .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }
    
    .modal-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
    
    .modal-body {
        padding: 24px;
    }
    
    .garage-info {
        margin-bottom: 24px;
        text-align: center;
        padding: 16px;
        background: #f8fafc;
        border-radius: 12px;
    }
    
    .garage-info h4 {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        color: #1f2937;
    }
    
    .garage-info p {
        margin: 0;
        color: #6b7280;
        font-size: 0.9rem;
    }
    
    .directions-options h5 {
        margin: 0 0 16px 0;
        font-size: 1rem;
        color: #374151;
        text-align: center;
    }
    
    .map-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .btn-map {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 24px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.2s ease;
        border: 2px solid transparent;
    }
    
    .btn-map i {
        margin-right: 12px;
        font-size: 1.1rem;
    }
    
    .google-maps {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        color: white;
    }
    
    .google-maps:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(66, 133, 244, 0.3);
        color: white;
    }
    
    .apple-maps {
        background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
        color: white;
    }
    
    .apple-maps:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
        color: white;
    }
    
    .waze {
        background: linear-gradient(135deg, #33ccff 0%, #00d4aa 100%);
        color: white;
    }
    
    .waze:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(51, 204, 255, 0.3);
        color: white;
    }
    
    .additional-info {
        margin-top: 20px;
        padding: 12px 16px;
        background: #fef3cd;
        border-radius: 8px;
        border-left: 4px solid #fbbf24;
    }
    
    .additional-info p {
        margin: 0;
        font-size: 0.875rem;
        color: #92400e;
    }
    
    .additional-info i {
        margin-right: 8px;
        color: #f59e0b;
    }
    
    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .modal-content {
            width: 95%;
            max-height: 85vh;
        }
        
        .modal-header {
            padding: 16px 20px 12px;
        }
        
        .modal-header h3 {
            font-size: 1.1rem;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .btn-map {
            padding: 14px 20px;
            font-size: 0.95rem;
        }
        
        .action-buttons {
            flex-direction: column;
            gap: 8px;
        }
        
        .btn-book,
        .btn-directions {
            flex: none;
            width: 100%;
        }
    }
`;
document.head.appendChild(style);
