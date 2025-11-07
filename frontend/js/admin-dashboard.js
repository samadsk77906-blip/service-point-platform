// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/api';
        this.adminToken = localStorage.getItem('adminToken');
        this.adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        
        if (!this.adminToken) {
            window.location.href = 'admin-login.html';
            return;
        }
        
        this.garages = [];
        this.sessionTimeoutMinutes = 120; // 2 hours session timeout to match backend token expiration
        this.lastActivity = Date.now();
        this.isPageVisible = true;
        
        this.init();
        this.setupSessionManagement();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadDashboardStats();
        await this.loadGarages();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('garage-form').addEventListener('submit', (e) => this.handleAddGarage(e));
        document.getElementById('edit-garage-form').addEventListener('submit', (e) => this.handleUpdateGarage(e));
        
        // GPS location buttons
        document.getElementById('get-current-location-btn').addEventListener('click', () => this.getCurrentLocation('add'));
        document.getElementById('edit-get-location-btn').addEventListener('click', () => this.getCurrentLocation('edit'));
        
        // Search functionality
        document.getElementById('garage-search').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Modal close events
        document.getElementById('edit-garage-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeEditModal();
            }
        });
        
        // Activity tracking for session management
        this.setupActivityTracking();
    }
    
    setupSessionManagement() {
        // Store initial session timestamp
        this.updateLastActivity();
        
        // Page visibility change detection
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // User navigated away or minimized
                this.isPageVisible = false;
                console.log('🔍 Admin page hidden - user navigated away');
            } else {
                // User returned to the page
                this.isPageVisible = true;
                console.log('👀 Admin page visible - user returned');
                this.checkSessionOnReturn();
            }
        });
        
        // Window focus/blur events as backup
        window.addEventListener('focus', () => {
            if (!this.isPageVisible) {
                this.isPageVisible = true;
                console.log('🎯 Admin window focused - user returned');
                this.checkSessionOnReturn();
            }
        });
        
        window.addEventListener('blur', () => {
            this.isPageVisible = false;
            console.log('💤 Admin window blurred - user may have left');
        });
        
        // Periodic session check (every 5 minutes)
        setInterval(() => {
            this.validateSession();
        }, 5 * 60 * 1000);
    }
    
    setupActivityTracking() {
        // Track user activity to update last activity timestamp
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.updateLastActivity();
        };
        
        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
    }
    
    updateLastActivity() {
        this.lastActivity = Date.now();
        // Store in localStorage to persist across page reloads
        localStorage.setItem('adminLastActivity', this.lastActivity.toString());
    }
    
    checkSessionOnReturn() {
        console.log('🔐 Checking admin session on return...');
        
        // Get stored last activity
        const storedLastActivity = localStorage.getItem('adminLastActivity');
        if (storedLastActivity) {
            this.lastActivity = parseInt(storedLastActivity);
        }
        
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        const sessionTimeoutMs = this.sessionTimeoutMinutes * 60 * 1000;
        
        console.log('⏱️ Admin session check:', {
            timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000 / 60) + ' minutes',
            sessionTimeoutMinutes: this.sessionTimeoutMinutes,
            isExpired: timeSinceLastActivity > sessionTimeoutMs
        });
        
        if (timeSinceLastActivity > sessionTimeoutMs) {
            console.log('⏰ Admin session expired - redirecting to login');
            this.handleSessionExpired();
        } else {
            console.log('✅ Admin session still valid');
            // Update activity timestamp since user is back
            this.updateLastActivity();
        }
    }
    
    validateSession() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        const sessionTimeoutMs = this.sessionTimeoutMinutes * 60 * 1000;
        
        if (timeSinceLastActivity > sessionTimeoutMs && this.isPageVisible) {
            console.log('⏰ Admin session expired during active use');
            this.handleSessionExpired();
        }
    }
    
    handleSessionExpired() {
        // Clear session data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        localStorage.removeItem('adminLastActivity');
        
        // Show session expired message with better UX
        this.showSessionExpiredModal();
    }
    
    showSessionExpiredModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;
        
        modal.innerHTML = `
            <div style="color: #dc2626; font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h2 style="margin-bottom: 1rem; color: #374151;">Admin Session Expired</h2>
            <p style="margin-bottom: 2rem; color: #6b7280;">Your admin session has expired for security reasons. You will be redirected to the login page.</p>
            <button id="admin-session-expired-ok" style="
                background: #dc2626;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 6px;
                font-size: 1rem;
                cursor: pointer;
            ">Continue to Admin Login</button>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Handle button click
        document.getElementById('admin-session-expired-ok').addEventListener('click', () => {
            window.location.href = 'admin-login.html';
        });
        
        // Auto-redirect after 10 seconds
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 10000);
    }

    loadUserInfo() {
        const userName = this.adminInfo.name || 'Admin';
        const userRole = this.adminInfo.role === 'main_admin' ? 'Main Admin' : 'Admin';
        
        document.getElementById('user-name').textContent = userName;
        document.getElementById('user-role').textContent = userRole;
        document.getElementById('user-avatar').textContent = userName.charAt(0).toUpperCase();
    }

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.adminToken}`
            }
        };

        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                ...defaultOptions,
                ...options,
                headers: { ...defaultOptions.headers, ...options.headers }
            });

            const data = await response.json();

            // Check for session expiration or auth failure
            if (response.status === 401) {
                if (data.sessionExpired || data.requiresLogin || data.message?.includes('expired')) {
                    console.log('🔐 Admin session expired detected from backend');
                    this.handleSessionExpired();
                    return; // Don't proceed further
                }
            }

            if (!response.ok) {
                const error = new Error(data.message || `HTTP ${response.status}`);
                error.errors = data.errors; // Preserve validation errors
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            // If it's a network error and we can't reach the server, don't auto-logout
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network connection failed. Please check your internet connection.');
            }
            
            throw error;
        }
    }

    async loadDashboardStats() {
        try {
            const response = await this.apiRequest('/admin/dashboard');
            const stats = response.data;
            
            document.getElementById('total-garages').textContent = stats.totalGarages || 0;
            document.getElementById('total-bookings').textContent = stats.totalBookings || 0;
            document.getElementById('pending-bookings').textContent = stats.pendingBookings || 0;
            document.getElementById('completed-bookings').textContent = stats.completedBookings || 0;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Failed to load dashboard statistics');
        }
    }

    async loadGarages() {
        const loadingElement = document.getElementById('garages-loading');
        const tableContainer = document.querySelector('.garage-table-container');
        const noDataElement = document.getElementById('no-garages');
        
        try {
            loadingElement.style.display = 'block';
            tableContainer.style.display = 'none';
            noDataElement.classList.add('hidden');

            const response = await this.apiRequest('/admin/garages?limit=100');
            this.garages = response.data.garages;

            loadingElement.style.display = 'none';

            if (this.garages.length === 0) {
                noDataElement.classList.remove('hidden');
            } else {
                tableContainer.style.display = 'block';
                this.renderGarageTable();
            }
        } catch (error) {
            console.error('Error loading garages:', error);
            loadingElement.style.display = 'none';
            this.showError('Failed to load garages');
        }
    }

    renderGarageTable(garagesToRender = this.garages) {
        const tbody = document.getElementById('garage-table-body');
        
        tbody.innerHTML = garagesToRender.map(garage => `
            <tr>
                <td><strong>${garage.garageId}</strong></td>
                <td>${garage.garageName}</td>
                <td>${garage.ownerName}</td>
                <td>${garage.email}</td>
                <td>${garage.contactNumber || garage.mobile || 'N/A'}</td>
                <td>${typeof garage.location === 'string' ? garage.location : 
                    `${garage.location.city}, ${garage.location.state}`}</td>
                <td>
                    <span class="status-badge ${garage.isActive ? 'status-active' : 'status-inactive'}">
                        ${garage.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <br>
                    <small class="registration-status ${garage.isRegistered ? 'registered' : 'not-registered'}">
                        ${garage.isRegistered ? '✓ Registered' : '⚠ Not Registered'}
                    </small>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-small" onclick="adminDashboard.editGarage('${garage._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="adminDashboard.deleteGarage('${garage._id}', '${garage.garageName}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.renderGarageTable();
            return;
        }

        const filtered = this.garages.filter(garage => 
            garage.garageName.toLowerCase().includes(query.toLowerCase()) ||
            garage.ownerName.toLowerCase().includes(query.toLowerCase()) ||
            garage.email.toLowerCase().includes(query.toLowerCase()) ||
            garage.garageId.toLowerCase().includes(query.toLowerCase()) ||
            (typeof garage.location === 'string' && garage.location.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderGarageTable(filtered);
    }

    async handleAddGarage(e) {
        e.preventDefault();
        this.clearFormErrors('garage-form');
        this.setFormLoading('submit-garage-btn', true);

        const formData = new FormData(e.target);
        const garageData = {};
        
        // Ensure required fields are included even if empty (for validation)
        const requiredFields = ['garageName', 'ownerName', 'email', 'contactNumber', 'location', 'latitude', 'longitude'];
        const optionalFields = ['garageId'];
        
        [...requiredFields, ...optionalFields].forEach(field => {
            const value = formData.get(field);
            if (value !== null) {
                garageData[field] = value.trim();
            }
        });
        
        console.log('Prepared garage data:', garageData);

        try {
            const response = await this.apiRequest('/admin/garage', {
                method: 'POST',
                body: JSON.stringify(garageData)
            });

            this.showSuccess('garage-form-success', `Garage "${garageData.garageName}" added successfully!`);
            
            // Reset form and reload garages
            e.target.reset();
            setTimeout(() => {
                this.toggleAddGarageForm();
                this.loadGarages();
                this.loadDashboardStats();
            }, 1500);

        } catch (error) {
            console.error('Error adding garage:', error);
            this.handleFormError('garage-form', error);
            
            // Run network diagnostics on error
            if (typeof NetworkDiagnostics !== 'undefined') {
                NetworkDiagnostics.runDiagnostics().then(results => {
                    NetworkDiagnostics.displayResults('diagnostic-container', results);
                });
            }
        } finally {
            this.setFormLoading('submit-garage-btn', false);
        }
    }

    async handleUpdateGarage(e) {
        e.preventDefault();
        this.clearFormErrors('edit-garage-form');
        this.setFormLoading('update-garage-btn', true);

        const garageId = document.getElementById('edit-garage-db-id').value;
        const formData = new FormData(e.target);
        const garageData = {};
        
        for (let [key, value] of formData.entries()) {
            if (value.trim()) {
                garageData[key] = value.trim();
            }
        }

        try {
            const response = await this.apiRequest(`/admin/garage/${garageId}`, {
                method: 'PUT',
                body: JSON.stringify(garageData)
            });

            this.showSuccess('edit-garage-form-success', 'Garage updated successfully!');
            
            setTimeout(() => {
                this.closeEditModal();
                this.loadGarages();
            }, 1500);

        } catch (error) {
            console.error('Error updating garage:', error);
            this.handleFormError('edit-garage-form', error);
        } finally {
            this.setFormLoading('update-garage-btn', false);
        }
    }

    editGarage(garageId) {
        const garage = this.garages.find(g => g._id === garageId);
        if (!garage) return;

        // Populate edit form
        document.getElementById('edit-garage-db-id').value = garage._id;
        document.getElementById('edit-garageName').value = garage.garageName;
        document.getElementById('edit-ownerName').value = garage.ownerName;
        document.getElementById('edit-email').value = garage.email;
        document.getElementById('edit-contactNumber').value = garage.contactNumber || garage.mobile || '';
        document.getElementById('edit-location').value = typeof garage.location === 'string' 
            ? garage.location 
            : `${garage.location.address || ''}, ${garage.location.city}, ${garage.location.state}, ${garage.location.country}`.replace(/^, /, '');
        
        // Populate coordinate fields
        document.getElementById('edit-latitude').value = garage.coordinates?.latitude || garage.latitude || '';
        document.getElementById('edit-longitude').value = garage.coordinates?.longitude || garage.longitude || '';

        // Show modal
        document.getElementById('edit-garage-modal').classList.add('show');
    }

    async deleteGarage(garageId, garageName) {
        if (!confirm(`Are you sure you want to delete "${garageName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            await this.apiRequest(`/admin/garage/${garageId}`, {
                method: 'DELETE'
            });

            this.showSuccess('', `Garage "${garageName}" deleted successfully!`);
            this.loadGarages();
            this.loadDashboardStats();
        } catch (error) {
            console.error('Error deleting garage:', error);
            this.showError(`Failed to delete garage: ${error.message}`);
        }
    }

    closeEditModal() {
        document.getElementById('edit-garage-modal').classList.remove('show');
        this.clearFormErrors('edit-garage-form');
    }

    toggleAddGarageForm() {
        const formContainer = document.getElementById('add-garage-form');
        const isHidden = formContainer.classList.contains('hidden');
        
        if (isHidden) {
            formContainer.classList.remove('hidden');
            document.getElementById('garageName').focus();
        } else {
            formContainer.classList.add('hidden');
            this.clearFormErrors('garage-form');
        }
    }

    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        form.querySelectorAll('.form-error, .form-success').forEach(el => el.textContent = '');
    }

    setFormLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.loading-spinner');
        
        if (loading) {
            button.disabled = true;
            buttonText.style.display = 'none';
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            buttonText.style.display = 'inline';
            spinner.classList.add('hidden');
        }
    }

    handleFormError(formId, error) {
        const form = document.getElementById(formId);
        
        console.log('Form Error Details:', error);
        
        // Try to parse error if it's a string
        let errorData = error;
        if (typeof error === 'string') {
            try {
                errorData = JSON.parse(error);
            } catch (e) {
                errorData = { message: error };
            }
        }
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
            // Handle validation errors
            errorData.errors.forEach(err => {
                const field = err.path || err.param;
                const errorElement = form.querySelector(`#${field}-error, #${formId.replace('-form', '')}-${field}-error`);
                if (errorElement) {
                    errorElement.textContent = err.msg || err.message;
                } else {
                    console.log(`Error element not found for field: ${field}`);
                }
            });
        } else {
            // Handle general error
            const errorElement = form.querySelector('.form-error');
            if (errorElement) {
                errorElement.textContent = errorData.message || 'An error occurred';
            }
        }
    }

    showSuccess(elementId, message) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
            }
        } else {
            // Create temporary success message
            const toast = this.createToast(message, 'success');
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    showError(message) {
        const toast = this.createToast(message, 'error');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            ${type === 'success' ? 'background: #38a169;' : 'background: #e53e3e;'}
        `;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        return toast;
    }

    // GPS Location Methods
    async getCurrentLocation(mode = 'add') {
        const btn = mode === 'add' 
            ? document.getElementById('get-current-location-btn')
            : document.getElementById('edit-get-location-btn');
        
        const latInput = mode === 'add' 
            ? document.getElementById('latitude')
            : document.getElementById('edit-latitude');
        
        const lonInput = mode === 'add' 
            ? document.getElementById('longitude')
            : document.getElementById('edit-longitude');

        if (!navigator.geolocation) {
            this.showLocationError(btn, 'Geolocation is not supported by this browser');
            return;
        }

        this.setLocationButtonLoading(btn, true);
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Set the coordinate values
                latInput.value = latitude.toFixed(6);
                lonInput.value = longitude.toFixed(6);
                
                // Clear any previous errors
                this.clearLocationMessages(btn);
                
                // Show success message
                this.showLocationSuccess(btn, `Location found: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                
                this.setLocationButtonLoading(btn, false);
            },
            (error) => {
                let errorMsg = 'Unable to get your location. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Please enable location permissions and refresh the page.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Location request timed out.';
                        break;
                    default:
                        errorMsg += 'An unknown error occurred.';
                }
                
                this.showLocationError(btn, errorMsg);
                this.setLocationButtonLoading(btn, false);
            },
            options
        );
    }

    setLocationButtonLoading(btn, loading) {
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
            btnLoading.classList.remove('hidden');
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
            btnLoading.classList.add('hidden');
        }
    }

    showLocationSuccess(btn, message) {
        this.clearLocationMessages(btn);
        
        const successDiv = document.createElement('div');
        successDiv.className = 'location-success';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        btn.parentNode.appendChild(successDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }

    showLocationError(btn, message) {
        this.clearLocationMessages(btn);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'location-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        btn.parentNode.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    clearLocationMessages(btn) {
        const parent = btn.parentNode;
        const existingMessages = parent.querySelectorAll('.location-success, .location-error');
        existingMessages.forEach(msg => msg.remove());
    }
}

// Global functions for onclick handlers
window.toggleAddGarageForm = () => adminDashboard.toggleAddGarageForm();
window.closeEditModal = () => adminDashboard.closeEditModal();
window.logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    window.location.href = 'admin-login.html';
};

// Initialize dashboard
const adminDashboard = new AdminDashboard();

// Add styles for animations and registration status
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .registration-status {
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
        display: inline-block;
    }
    
    .registration-status.registered {
        color: #16a34a;
    }
    
    .registration-status.not-registered {
        color: #dc2626;
    }
`;
document.head.appendChild(style);
