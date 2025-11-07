// Simple Location Search - Focused on Working City Dropdowns
console.log('🚀 Simple Location Search Loading...');

class SimpleLocationSearch {
    constructor() {
        this.apiBase = '/api';
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }
    
    init() {
        console.log('🔧 Initializing SimpleLocationSearch...');
        
        // Get elements
        this.country = document.getElementById('country-select');
        this.state = document.getElementById('state-select');  
        this.city = document.getElementById('city-select');
        this.district = document.getElementById('district-select');
        
        if (!this.country || !this.state || !this.city) {
            console.error('❌ Required dropdown elements not found!');
            return;
        }
        
        console.log('✅ All dropdown elements found');
        
        // Setup listeners
        this.country.addEventListener('change', () => this.onCountryChange());
        this.state.addEventListener('change', () => this.onStateChange());
        this.city.addEventListener('change', () => this.onCityChange());
        
        // Setup India by default
        this.setupIndia();
    }
    
    setupIndia() {
        console.log('🇮🇳 Setting up India...');
        
        // Clear and set country to India
        this.country.innerHTML = `
            <option value="">Select Country</option>
            <option value="India" selected>India</option>
        `;
        
        // Load states for India
        this.loadStates();
    }
    
    async loadStates() {
        console.log('🗺️ Loading Indian states...');
        
        try {
            const response = await fetch(`${this.apiBase}/location/states`);
            const data = await response.json();
            
            console.log('📊 States response:', data);
            
            if (data.success && data.data) {
                this.populateDropdown(this.state, data.data, 'Select State');
                this.state.disabled = false;
                console.log(`✅ Loaded ${data.data.length} states`);
            } else {
                console.error('❌ States API returned unsuccessful response');
            }
        } catch (error) {
            console.error('❌ Error loading states:', error);
        }
    }
    
    onCountryChange() {
        const country = this.country.value;
        console.log('🏳️ Country changed to:', country);
        
        if (country === 'India') {
            this.loadStates();
        } else {
            this.clearDropdown(this.state, 'Select State');
            this.clearDropdown(this.city, 'Select City'); 
            this.clearDropdown(this.district, 'Select District');
        }
    }
    
    async onStateChange() {
        const state = this.state.value;
        console.log('🏛️ State changed to:', state);
        
        // Clear dependent dropdowns
        this.clearDropdown(this.city, 'Select City');
        this.clearDropdown(this.district, 'Select District');
        
        if (!state) return;
        
        try {
            const url = `${this.apiBase}/location/cities/${encodeURIComponent(state)}`;
            console.log('🔗 Fetching cities from:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('📊 Cities response:', data);
            console.log('📊 Response type:', typeof data);
            console.log('📊 Is array?', Array.isArray(data));
            
            let cities = [];
            
            // Handle different response formats
            if (Array.isArray(data)) {
                cities = data;
                console.log('📋 Direct array format');
            } else if (data.success && data.data) {
                cities = data.data;
                console.log('📋 Success wrapper format');
            } else if (data.cities) {
                cities = data.cities;
                console.log('📋 Cities property format');
            } else {
                console.log('📋 Unknown format, trying as-is');
                cities = data;
            }
            
            console.log('🏙️ Processing cities:', cities);
            console.log('🏙️ Cities count:', Array.isArray(cities) ? cities.length : 'Not array');
            
            if (Array.isArray(cities) && cities.length > 0) {
                console.log('🏙️ First few cities:', cities.slice(0, 3));
                this.populateDropdown(this.city, cities, 'Select City');
                this.city.disabled = false;
                console.log(`✅ Successfully loaded ${cities.length} cities for ${state}`);
            } else {
                console.log('⚠️ No cities found or invalid format');
                this.clearDropdown(this.city, 'No cities available');
            }
            
        } catch (error) {
            console.error('❌ Error loading cities:', error);
            this.clearDropdown(this.city, 'Error loading cities');
        }
    }
    
    async onCityChange() {
        const city = this.city.value;
        const state = this.state.value;
        console.log('🏢 City changed to:', city);
        
        this.clearDropdown(this.district, 'Select District');
        
        if (!city || !state) return;
        
        try {
            const url = `${this.apiBase}/location/districts/${encodeURIComponent(state)}/${encodeURIComponent(city)}`;
            console.log('🔗 Fetching districts from:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('📊 Districts response:', data);
            
            let districts = [];
            
            if (Array.isArray(data)) {
                districts = data;
            } else if (data.success && data.data) {
                districts = data.data;
            } else if (data.districts) {
                districts = data.districts;
            }
            
            if (Array.isArray(districts) && districts.length > 0) {
                this.populateDropdown(this.district, districts, 'Select District');
                this.district.disabled = false;
                console.log(`✅ Loaded ${districts.length} districts for ${city}`);
            } else {
                this.clearDropdown(this.district, 'No districts available');
            }
            
        } catch (error) {
            console.error('❌ Error loading districts:', error);
            this.clearDropdown(this.district, 'Error loading districts');
        }
    }
    
    populateDropdown(dropdown, items, placeholder) {
        console.log(`🔄 Populating ${dropdown.id} with ${items ? items.length : 0} items`);
        
        if (!dropdown || !Array.isArray(items)) {
            console.error('❌ Invalid dropdown or items for populate');
            return;
        }
        
        // Clear existing
        dropdown.innerHTML = '';
        
        // Add placeholder
        const placeholderOption = new Option(placeholder, '', false, true);
        placeholderOption.disabled = true;
        dropdown.appendChild(placeholderOption);
        
        // Add items
        items.forEach((item, index) => {
            const value = typeof item === 'string' ? item : item.name || item.value || item;
            const option = new Option(value, value, false, false);
            dropdown.appendChild(option);
            
            if (index < 3) {
                console.log(`  📝 Added option: "${value}"`);
            }
        });
        
        console.log(`✅ ${dropdown.id} populated with ${items.length} options`);
        
        // Verify options were added
        const optionsCount = dropdown.options.length - 1; // Exclude placeholder
        console.log(`🔍 Verification: ${dropdown.id} now has ${optionsCount} selectable options`);
    }
    
    clearDropdown(dropdown, placeholder) {
        if (!dropdown) return;
        
        dropdown.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
        dropdown.disabled = true;
        console.log(`🧹 Cleared ${dropdown.id}`);
    }
    
    getSelectedLocation() {
        return {
            country: this.country?.value || '',
            state: this.state?.value || '',
            city: this.city?.value || '',
            district: this.district?.value || ''
        };
    }
}

// Initialize
console.log('🎯 Creating SimpleLocationSearch instance...');
window.simpleLocationSearch = new SimpleLocationSearch();