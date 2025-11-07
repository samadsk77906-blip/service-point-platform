// Garage Dashboard JavaScript
class GarageDashboard {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/api';
        this.garageToken = localStorage.getItem('garageToken');
        this.garageInfo = JSON.parse(localStorage.getItem('garageInfo') || '{}');
        
        if (!this.garageToken) {
            console.log('❌ No garage token found - redirecting to login');
            window.location.replace('garage-login.html');
            return;
        }
        
        this.services = [];
        this.bookings = [];
        this.currentStatusFilter = '';
        this.sessionTimeoutMinutes = 120; // 2 hours session timeout to match backend token expiration
        this.lastActivity = Date.now();
        this.isPageVisible = true;
        
        this.init();
        this.setupSessionManagement();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadBookings();
        await this.loadDashboardStats();
        await this.loadServices();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('service-form').addEventListener('submit', (e) => this.handleAddService(e));
        document.getElementById('edit-service-form').addEventListener('submit', (e) => this.handleUpdateService(e));
        
        // Search functionality
        document.getElementById('service-search').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Modal close events
        document.getElementById('edit-service-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeEditServiceModal();
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
                console.log('🔍 Page hidden - user navigated away');
            } else {
                // User returned to the page
                this.isPageVisible = true;
                console.log('👀 Page visible - user returned');
                this.checkSessionOnReturn();
            }
        });
        
        // Window focus/blur events as backup
        window.addEventListener('focus', () => {
            if (!this.isPageVisible) {
                this.isPageVisible = true;
                console.log('🎯 Window focused - user returned');
                this.checkSessionOnReturn();
            }
        });
        
        window.addEventListener('blur', () => {
            this.isPageVisible = false;
            console.log('💤 Window blurred - user may have left');
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
        localStorage.setItem('garageLastActivity', this.lastActivity.toString());
    }
    
    checkSessionOnReturn() {
        console.log('🔐 Checking session on return...');
        
        // Get stored last activity
        const storedLastActivity = localStorage.getItem('garageLastActivity');
        if (storedLastActivity) {
            this.lastActivity = parseInt(storedLastActivity);
        }
        
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        const sessionTimeoutMs = this.sessionTimeoutMinutes * 60 * 1000;
        
        console.log('⏱️ Session check:', {
            timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000 / 60) + ' minutes',
            sessionTimeoutMinutes: this.sessionTimeoutMinutes,
            isExpired: timeSinceLastActivity > sessionTimeoutMs
        });
        
        if (timeSinceLastActivity > sessionTimeoutMs) {
            console.log('⏰ Session expired - redirecting to login');
            this.handleSessionExpired();
        } else {
            console.log('✅ Session still valid');
            // Update activity timestamp since user is back
            this.updateLastActivity();
        }
    }
    
    validateSession() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        const sessionTimeoutMs = this.sessionTimeoutMinutes * 60 * 1000;
        
        if (timeSinceLastActivity > sessionTimeoutMs && this.isPageVisible) {
            console.log('⏰ Session expired during active use');
            this.handleSessionExpired();
        }
    }
    
    handleSessionExpired() {
        // Clear session data
        localStorage.removeItem('garageToken');
        localStorage.removeItem('garageInfo');
        localStorage.removeItem('garageLastActivity');
        
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
            <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-clock"></i>
            </div>
            <h2 style="margin-bottom: 1rem; color: #374151;">Session Expired</h2>
            <p style="margin-bottom: 2rem; color: #6b7280;">Your session has expired for security reasons. You will be redirected to the login page.</p>
            <button id="session-expired-ok" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 6px;
                font-size: 1rem;
                cursor: pointer;
            ">Continue to Login</button>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Handle button click
        document.getElementById('session-expired-ok').addEventListener('click', () => {
            window.location.replace('garage-login.html');
        });
        
        // Auto-redirect after 10 seconds
        setTimeout(() => {
            window.location.replace('garage-login.html');
        }, 10000);
    }

    loadUserInfo() {
        const garageName = this.garageInfo.garageName || 'Garage';
        const garageId = this.garageInfo.garageId || 'N/A';
        
        document.getElementById('user-name').textContent = garageName;
        document.getElementById('garage-id').textContent = garageId;
        document.getElementById('user-avatar').textContent = garageName.charAt(0).toUpperCase();
    }

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.garageToken}`
            }
        };

        console.log('🔍 API Request:', {
            url: `${this.API_BASE_URL}${endpoint}`,
            token: this.garageToken ? 'Present' : 'Missing',
            garageInfo: this.garageInfo
        });

        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                ...defaultOptions,
                ...options,
                headers: { ...defaultOptions.headers, ...options.headers }
            });

            console.log('📡 API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            const data = await response.json();
            console.log('📄 Response Data:', data);

            // Check for session expiration or auth failure
            if (response.status === 401) {
                if (data.sessionExpired || data.requiresLogin || data.message?.includes('expired')) {
                    console.log('🔐 Session expired detected from backend');
                    this.handleSessionExpired();
                    return; // Don't proceed further
                }
            }

            if (!response.ok) {
                const error = new Error(data.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ API Request Failed:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            
            // If it's a network error and we can't reach the server, don't auto-logout
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network connection failed. Please check your internet connection.');
            }
            
            throw error;
        }
    }

    async loadDashboardStats() {
        try {
            const response = await this.apiRequest('/garage/dashboard/stats');
            const stats = response.data;
            
            document.getElementById('total-services').textContent = this.services.length || 0;
            document.getElementById('total-bookings').textContent = stats.totalBookings || 0;
            document.getElementById('pending-bookings').textContent = stats.pendingBookings || 0;
            document.getElementById('completed-bookings').textContent = stats.completedBookings || 0;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Don't show error for stats - it's not critical
        }
    }

    async loadServices() {
        const loadingElement = document.getElementById('services-loading');
        const serviceGrid = document.getElementById('service-grid');
        const noDataElement = document.getElementById('no-services');
        
        try {
            loadingElement.style.display = 'block';
            serviceGrid.style.display = 'none';
            noDataElement.classList.add('hidden');

            const response = await this.apiRequest('/garage/services');
            this.services = response.data.services;

            loadingElement.style.display = 'none';

            if (this.services.length === 0) {
                noDataElement.classList.remove('hidden');
            } else {
                serviceGrid.style.display = 'grid';
                this.renderServiceGrid();
            }

            // Update service count in stats
            document.getElementById('total-services').textContent = this.services.length;

        } catch (error) {
            console.error('Error loading services:', error);
            loadingElement.style.display = 'none';
            this.showError('Failed to load services');
        }
    }

    renderServiceGrid(servicesToRender = this.services) {
        const serviceGrid = document.getElementById('service-grid');
        
        serviceGrid.innerHTML = servicesToRender.map(service => `
            <div class="service-card">
                <div class="service-header">
                    <h3 class="service-name">${service.serviceName}</h3>
                    <span class="service-category">${service.category}</span>
                </div>
                ${service.description ? `<p class="service-description">${service.description}</p>` : ''}
                <div class="service-details">
                    <span class="service-price">₹${service.price.amount}</span>
                    ${service.estimatedDuration ? `<span class="service-duration">${service.estimatedDuration}</span>` : ''}
                </div>
                <div class="service-actions">
                    <button class="btn btn-secondary btn-small" onclick="garageDashboard.editService('${service._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="garageDashboard.deleteService('${service._id}', '${service.serviceName}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.renderServiceGrid();
            return;
        }

        const filtered = this.services.filter(service => 
            service.serviceName.toLowerCase().includes(query.toLowerCase()) ||
            service.category.toLowerCase().includes(query.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderServiceGrid(filtered);
    }

    async handleAddService(e) {
        e.preventDefault();
        this.clearFormErrors('service-form');
        this.setFormLoading('submit-service-btn', true);

        const formData = new FormData(e.target);
        const serviceData = {};
        
        // Handle nested price object
        for (let [key, value] of formData.entries()) {
            if (key.includes('.')) {
                const [parent, child] = key.split('.');
                if (!serviceData[parent]) serviceData[parent] = {};
                serviceData[parent][child] = parent === 'price' ? parseFloat(value) : value;
            } else if (value.trim()) {
                serviceData[key] = value.trim();
            }
        }

        try {
            const response = await this.apiRequest('/garage/service', {
                method: 'POST',
                body: JSON.stringify(serviceData)
            });

            this.showSuccess('service-form-success', `Service "${serviceData.serviceName}" added successfully!`);
            
            // Reset form and reload services
            e.target.reset();
            setTimeout(() => {
                this.toggleAddServiceForm();
                this.loadServices();
            }, 1500);

        } catch (error) {
            console.error('Error adding service:', error);
            this.handleFormError('service-form', error);
        } finally {
            this.setFormLoading('submit-service-btn', false);
        }
    }

    async handleUpdateService(e) {
        e.preventDefault();
        this.clearFormErrors('edit-service-form');
        this.setFormLoading('update-service-btn', true);

        const serviceId = document.getElementById('edit-service-id').value;
        const formData = new FormData(e.target);
        const serviceData = {};
        
        // Handle nested price object
        for (let [key, value] of formData.entries()) {
            if (key.includes('.')) {
                const [parent, child] = key.split('.');
                if (!serviceData[parent]) serviceData[parent] = {};
                serviceData[parent][child] = parent === 'price' ? parseFloat(value) : value;
            } else if (value.trim()) {
                serviceData[key] = value.trim();
            }
        }

        try {
            const response = await this.apiRequest(`/garage/service/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(serviceData)
            });

            this.showSuccess('edit-service-form-success', 'Service updated successfully!');
            
            setTimeout(() => {
                this.closeEditServiceModal();
                this.loadServices();
            }, 1500);

        } catch (error) {
            console.error('Error updating service:', error);
            this.handleFormError('edit-service-form', error);
        } finally {
            this.setFormLoading('update-service-btn', false);
        }
    }

    editService(serviceId) {
        const service = this.services.find(s => s._id === serviceId);
        if (!service) return;

        // Populate edit form
        document.getElementById('edit-service-id').value = service._id;
        document.getElementById('edit-serviceName').value = service.serviceName;
        document.getElementById('edit-category').value = service.category;
        document.getElementById('edit-priceAmount').value = service.price.amount;
        document.getElementById('edit-estimatedDuration').value = service.estimatedDuration || '';
        document.getElementById('edit-description').value = service.description || '';

        // Show modal
        document.getElementById('edit-service-modal').classList.add('show');
    }

    async deleteService(serviceId, serviceName) {
        if (!confirm(`Are you sure you want to delete "${serviceName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            await this.apiRequest(`/garage/service/${serviceId}`, {
                method: 'DELETE'
            });

            this.showSuccess('', `Service "${serviceName}" deleted successfully!`);
            this.loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showError(`Failed to delete service: ${error.message}`);
        }
    }

    closeEditServiceModal() {
        document.getElementById('edit-service-modal').classList.remove('show');
        this.clearFormErrors('edit-service-form');
    }

    toggleAddServiceForm() {
        const formContainer = document.getElementById('add-service-form');
        const isHidden = formContainer.classList.contains('hidden');
        
        if (isHidden) {
            formContainer.classList.remove('hidden');
            document.getElementById('serviceName').focus();
        } else {
            formContainer.classList.add('hidden');
            this.clearFormErrors('service-form');
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
        
        if (error.message && error.message.includes('errors') && error.errors) {
            // Handle validation errors
            error.errors.forEach(err => {
                const field = err.path || err.param;
                const errorElement = form.querySelector(`#${field}-error, #${formId.replace('-form', '')}-${field}-error`);
                if (errorElement) {
                    errorElement.textContent = err.msg || err.message;
                }
            });
        } else {
            // Handle general error
            const errorElement = form.querySelector('.form-error');
            if (errorElement) {
                errorElement.textContent = error.message || 'An error occurred';
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

    // ===== BOOKING MANAGEMENT METHODS =====
    async loadBookings() {
        const loadingElement = document.getElementById('bookings-loading');
        const bookingsGrid = document.getElementById('bookings-grid');
        const noDataElement = document.getElementById('no-bookings');
        
        try {
            loadingElement.style.display = 'block';
            bookingsGrid.style.display = 'none';
            noDataElement.classList.add('hidden');

            const response = await this.apiRequest(`/booking/garage/${this.garageInfo.id}`);
            this.bookings = response.data.bookings;
            this.bookingStats = response.data.stats;

            loadingElement.style.display = 'none';

            if (this.bookings.length === 0) {
                noDataElement.classList.remove('hidden');
            } else {
                bookingsGrid.style.display = 'grid';
                this.renderBookingsGrid();
            }

            // Update booking stats
            if (this.bookingStats) {
                document.getElementById('total-bookings').textContent = this.bookingStats.total;
                document.getElementById('pending-bookings').textContent = this.bookingStats.pending;
                document.getElementById('completed-bookings').textContent = this.bookingStats.completed;
            }

        } catch (error) {
            console.error('Error loading bookings:', error);
            loadingElement.style.display = 'none';
            this.showError('Failed to load bookings');
        }
    }

    renderBookingsGrid(bookingsToRender = this.bookings) {
        const bookingsGrid = document.getElementById('bookings-grid');
        
        bookingsGrid.innerHTML = bookingsToRender.map(booking => {
            const statusColor = this.getStatusColor(booking.status);
            const statusIcon = this.getStatusIcon(booking.status);
            const isClickable = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'in_progress';
            
            return `
                <div class="booking-card ${isClickable ? 'clickable' : ''}" onclick="${isClickable ? `garageDashboard.openBookingAction('${booking._id}')` : ''}">
                    <div class="booking-header">
                        <div class="booking-id">#${booking.bookingId}</div>
                        <span class="booking-status status-${booking.status}" style="background-color: ${statusColor}">
                            <i class="fas fa-${statusIcon}"></i> ${booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    
                    <div class="booking-service">
                        <h3>${booking.service}</h3>
                    </div>
                    
                    <div class="booking-customer">
                        <div><i class="fas fa-user"></i> ${booking.userName}</div>
                        <div><i class="fas fa-phone"></i> ${booking.userPhone}</div>
                        ${booking.userEmail ? `<div><i class="fas fa-envelope"></i> ${booking.userEmail}</div>` : ''}
                    </div>
                    
                    <div class="booking-schedule">
                        <div><i class="fas fa-calendar"></i> ${new Date(booking.scheduledDate).toLocaleDateString()}</div>
                        <div><i class="fas fa-clock"></i> ${booking.scheduledTime}</div>
                    </div>
                    
                    ${booking.vehicleInfo ? `
                        <div class="booking-vehicle">
                            <i class="fas fa-car"></i> ${booking.vehicleInfo.make} ${booking.vehicleInfo.model} 
                            ${booking.vehicleInfo.licensePlate ? `(${booking.vehicleInfo.licensePlate})` : ''}
                        </div>
                    ` : ''}
                    
                    ${booking.notes ? `<div class="booking-notes"><i class="fas fa-sticky-note"></i> ${booking.notes}</div>` : ''}
                    
                    ${booking.estimatedCost?.amount ? `
                        <div class="booking-cost">
                            <i class="fas fa-rupee-sign"></i> Estimated: ₹${booking.estimatedCost.amount}
                        </div>
                    ` : ''}
                    
                    ${booking.actualCost?.amount ? `
                        <div class="booking-cost">
                            <i class="fas fa-rupee-sign"></i> Final: ₹${booking.actualCost.amount}
                        </div>
                    ` : ''}
                    
                    <div class="booking-footer">
                        <small>Created: ${new Date(booking.createdAt).toLocaleDateString()}</small>
                        ${isClickable ? '<div class="click-hint"><i class="fas fa-hand-pointer"></i> Click to manage</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusColor(status) {
        const colors = {
            'pending': '#f59e0b',
            'confirmed': '#3b82f6',
            'in_progress': '#8b5cf6',
            'completed': '#10b981',
            'cancelled': '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    getStatusIcon(status) {
        const icons = {
            'pending': 'clock',
            'confirmed': 'check-circle',
            'in_progress': 'cog',
            'completed': 'check-circle',
            'cancelled': 'times-circle'
        };
        return icons[status] || 'question-circle';
    }

    filterBookings() {
        const statusFilter = document.getElementById('status-filter').value;
        this.currentStatusFilter = statusFilter;
        
        if (!statusFilter) {
            this.renderBookingsGrid();
            return;
        }
        
        const filteredBookings = this.bookings.filter(booking => booking.status === statusFilter);
        this.renderBookingsGrid(filteredBookings);
    }

    openBookingAction(bookingId) {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (!booking) return;
        
        this.currentBooking = booking;
        
        // Populate booking details
        document.getElementById('booking-details').innerHTML = `
            <div class="booking-summary">
                <h4>Booking #${booking.bookingId}</h4>
                <div class="detail-grid">
                    <div><strong>Service:</strong> ${booking.service}</div>
                    <div><strong>Customer:</strong> ${booking.userName}</div>
                    <div><strong>Phone:</strong> ${booking.userPhone}</div>
                    <div><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> ${booking.scheduledTime}</div>
                    <div><strong>Status:</strong> <span class="status-${booking.status}">${booking.status.toUpperCase()}</span></div>
                </div>
                ${booking.vehicleInfo ? `
                    <div class="vehicle-info">
                        <strong>Vehicle:</strong> ${booking.vehicleInfo.make} ${booking.vehicleInfo.model} ${booking.vehicleInfo.year || ''}
                        ${booking.vehicleInfo.licensePlate ? `<br><strong>License:</strong> ${booking.vehicleInfo.licensePlate}` : ''}
                    </div>
                ` : ''}
                ${booking.notes ? `<div class="booking-note"><strong>Notes:</strong> ${booking.notes}</div>` : ''}
            </div>
        `;
        
        // Show appropriate action buttons based on status
        this.setupBookingActionButtons(booking.status);
        
        // Clear form
        document.getElementById('action-booking-id').value = booking._id;
        document.getElementById('estimated-cost').value = booking.estimatedCost?.amount || '';
        document.getElementById('actual-cost').value = booking.actualCost?.amount || '';
        document.getElementById('action-note').value = '';
        
        // Show modal
        document.getElementById('booking-action-modal').classList.add('show');
    }

    setupBookingActionButtons(status) {
        const buttons = {
            'accept-btn': document.getElementById('accept-btn'),
            'reject-btn': document.getElementById('reject-btn'),
            'start-btn': document.getElementById('start-btn'),
            'complete-btn': document.getElementById('complete-btn')
        };
        
        const costGroups = {
            'estimated-cost-group': document.getElementById('estimated-cost-group'),
            'actual-cost-group': document.getElementById('actual-cost-group')
        };
        
        // Hide all buttons and cost fields initially
        Object.values(buttons).forEach(btn => btn.style.display = 'none');
        Object.values(costGroups).forEach(group => group.style.display = 'none');
        
        // Show appropriate buttons and fields based on status
        switch (status) {
            case 'pending':
                buttons['accept-btn'].style.display = 'inline-block';
                buttons['reject-btn'].style.display = 'inline-block';
                costGroups['estimated-cost-group'].style.display = 'block';
                document.getElementById('booking-action-title').textContent = 'Accept or Reject Booking';
                break;
                
            case 'confirmed':
                buttons['start-btn'].style.display = 'inline-block';
                buttons['reject-btn'].style.display = 'inline-block';
                document.getElementById('booking-action-title').textContent = 'Start or Cancel Service';
                break;
                
            case 'in_progress':
                buttons['complete-btn'].style.display = 'inline-block';
                costGroups['actual-cost-group'].style.display = 'block';
                document.getElementById('booking-action-title').textContent = 'Complete Service';
                break;
        }
    }

    async processBookingAction(newStatus) {
        const bookingId = this.currentBooking.bookingId;
        const note = document.getElementById('action-note').value.trim();
        const estimatedCost = document.getElementById('estimated-cost').value;
        const actualCost = document.getElementById('actual-cost').value;
        
        const updateData = {
            status: newStatus,
            note
        };
        
        // Add cost data if provided
        if (estimatedCost && parseFloat(estimatedCost) > 0) {
            updateData.estimatedCost = {
                amount: parseFloat(estimatedCost),
                currency: 'INR'
            };
        }
        
        if (actualCost && parseFloat(actualCost) > 0) {
            updateData.actualCost = {
                amount: parseFloat(actualCost),
                currency: 'INR'
            };
        }
        
        try {
            this.clearFormErrors('booking-action-form');
            
            const response = await this.apiRequest(`/booking/${bookingId}/status`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            this.showSuccess('booking-action-success', response.message);
            
            // Reload bookings and close modal
            setTimeout(() => {
                this.closeBookingActionModal();
                this.loadBookings();
            }, 1500);
            
        } catch (error) {
            console.error('Error updating booking status:', error);
            document.getElementById('booking-action-error').textContent = error.message || 'Failed to update booking';
        }
    }

    closeBookingActionModal() {
        document.getElementById('booking-action-modal').classList.remove('show');
        this.clearFormErrors('booking-action-form');
        this.currentBooking = null;
    }
}

// Global functions for onclick handlers
window.toggleAddServiceForm = () => garageDashboard.toggleAddServiceForm();
window.closeEditServiceModal = () => garageDashboard.closeEditServiceModal();
window.filterBookings = () => garageDashboard.filterBookings();
window.closeBookingActionModal = () => garageDashboard.closeBookingActionModal();
window.processBookingAction = (status) => garageDashboard.processBookingAction(status);
window.logout = () => {
    console.log('🚪 Logging out garage user...');
    
    // Clear all session data
    localStorage.removeItem('garageToken');
    localStorage.removeItem('garageInfo');
    localStorage.removeItem('garageLastActivity');
    
    // Clear any cached data
    if (window.sessionStorage) {
        sessionStorage.clear();
    }
    
    // Use replace() to prevent back button access to dashboard
    window.location.replace('garage-login.html');
};

// Initialize dashboard
const garageDashboard = new GarageDashboard();

// Add styles for animations
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
`;
document.head.appendChild(style);