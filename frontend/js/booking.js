// Booking page behavior
(function() {
  const form = document.getElementById('booking-form');
  const garageSelect = document.getElementById('garageId');
  const serviceSelect = document.getElementById('service');
  const successModal = document.getElementById('success-modal');
  const successText = document.getElementById('success-text');
  const trackLink = document.getElementById('track-link');
  const submitBtn = document.getElementById('submit-btn');

  // Mini location filters
  const country = document.getElementById('country');
  const state = document.getElementById('state');
  const city = document.getElementById('city');
  const district = document.getElementById('district');
  const refresh = document.getElementById('refresh-garages');

  // Initialize from URL params (service and garageId)
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const prefillService = params.get('service') || '';
    const prefillGarageId = params.get('garageId') || '';

    if (prefillService) {
      serviceSelect.value = prefillService;
    }

    await loadLocations();
    await loadGarages();

    if (prefillGarageId) {
      garageSelect.value = prefillGarageId;
      updateSelectedGarage();
    }

    // Set minimum date to today
    const dateInput = document.getElementById('scheduledDate');
    const timeInput = document.getElementById('scheduledTime');
    
    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.min = `${yyyy}-${mm}-${dd}`;
      
      // Add event listener to update minimum time when date changes
      dateInput.addEventListener('change', updateMinimumTime);
    }
    
    if (timeInput) {
      timeInput.addEventListener('change', validateSelectedTime);
    }
    
    // Set initial minimum time if today is selected
    updateMinimumTime();
  });

  // Load location dropdowns
  async function loadLocations() {
    try {
      const res = await garageAPI.getLocations();
      const locs = res.data;
      populate(country, locs.countries);
      // Removed cascade event listeners - they're handled below
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }

  async function cascade(level) {
    const q = { };
    if (country.value) q.country = country.value;
    if (state.value) q.state = state.value;
    if (city.value) q.city = city.value;

    const res = await garageAPI.getLocations(toQuery(q));
    const locs = res.data;

    if (level === 'state') {
      resetSelect(state, 'State');
      resetSelect(city, 'City', true);
      resetSelect(district, 'District', true);
      populate(state, locs.states);
      state.disabled = false;
    } else if (level === 'city') {
      resetSelect(city, 'City');
      resetSelect(district, 'District', true);
      populate(city, locs.cities);
      city.disabled = false;
    } else if (level === 'district') {
      resetSelect(district, 'District');
      populate(district, locs.districts);
      district.disabled = false;
    }
  }

  function populate(select, options) {
    resetSelect(select, select?.dataset?.placeholder || select?.id || 'Select');
    options?.sort()?.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });
  }

  function resetSelect(select, label = 'Select', disabled = false) {
    if (!select) return;
    select.innerHTML = '';
    const o = document.createElement('option');
    o.value = '';
    o.textContent = label;
    select.appendChild(o);
    select.disabled = !!disabled;
  }

  // Load garages list using current location filters only
  async function loadGarages() {
    const filters = { };
    if (country.value) filters.country = country.value;
    if (state.value) filters.state = state.value;
    if (city.value) filters.city = city.value;
    if (district.value) filters.district = district.value;
    // Remove service filtering to prevent garage selection loss
    // if (serviceSelect.value) filters.service = serviceSelect.value;

    try {
      const res = await garageAPI.search(filters);
      const garages = res.data.garages || [];
      refillGarageSelect(garages);
    } catch (e) {
      console.error('Failed to load garages', e);
      showToast('Unable to load garages', 'error');
    }
  }

  function refillGarageSelect(garages) {
    // Store the currently selected garage ID before resetting
    const currentlySelected = garageSelect.value;
    console.log('🔄 Refilling garage select. Currently selected:', currentlySelected);
    
    resetSelect(garageSelect, 'Choose a garage');
    garages.forEach(g => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = `${g.garageName} — ${g.location?.city || ''}`.trim();
      o.dataset.owner = g.ownerName || '';
      o.dataset.mobile = g.mobile || '';
      o.dataset.email = g.email || '';
      o.dataset.services = (g.services || []).join(', ');
      o.dataset.location = `${g.location?.city || ''}, ${g.location?.district || ''}`;
      garageSelect.appendChild(o);
    });
    
    // Restore the previously selected garage if it's still available
    if (currentlySelected) {
      const stillAvailable = garages.find(g => g.id === currentlySelected);
      console.log('✅ Trying to restore garage selection. Still available:', !!stillAvailable);
      if (stillAvailable) {
        garageSelect.value = currentlySelected;
        console.log('🎯 Garage selection restored:', garageSelect.value);
        updateSelectedGarage();
      } else {
        console.log('❌ Previously selected garage no longer available');
      }
    } else {
      console.log('ℹ️ No garage was previously selected');
    }
  }

  refresh?.addEventListener('click', async () => {
    console.log('Manually refreshing garages...');
    await loadGarages();
    // Don't call updateSelectedGarage() here as it will be called by refillGarageSelect if needed
  });

  // Remove automatic garage reloading when service changes to preserve selection
  // serviceSelect?.addEventListener('change', loadGarages);
  garageSelect?.addEventListener('change', updateSelectedGarage);
  
  // Only reload garages when location filters change
  country?.addEventListener('change', async () => {
    await cascade('state');
    await loadGarages();
  });
  state?.addEventListener('change', async () => {
    await cascade('city');
    await loadGarages();
  });
  city?.addEventListener('change', async () => {
    await cascade('district');
    await loadGarages();
  });
  district?.addEventListener('change', async () => {
    await loadGarages();
  });

  function updateSelectedGarage() {
    const panel = document.getElementById('selected-garage');
    if (!panel) return;

    const option = garageSelect.options[garageSelect.selectedIndex];
    if (!option || !option.value) {
      panel.classList.add('empty');
      panel.innerHTML = '<p>Select a garage to see details here.</p>';
      return;
    }

    panel.classList.remove('empty');
    panel.innerHTML = `
      <div class="selected-garage-card">
        <h4>${option.text}</h4>
        <p><strong>Owner:</strong> ${option.dataset.owner || 'N/A'}</p>
        <p><strong>Phone:</strong> ${option.dataset.mobile || 'N/A'}</p>
        <p><strong>Email:</strong> ${option.dataset.email || 'N/A'}</p>
        <p><strong>Services:</strong> ${option.dataset.services || 'N/A'}</p>
      </div>
    `;
  }

  // Helper functions for time validation
  function updateMinimumTime() {
    const dateInput = document.getElementById('scheduledDate');
    const timeInput = document.getElementById('scheduledTime');
    
    if (!dateInput || !timeInput) return;
    
    const selectedDate = dateInput.value;
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedDate === today) {
      // For today's bookings, set minimum time to 15 minutes from now
      const now = new Date();
      const minimumTime = new Date(now.getTime() + 15 * 60 * 1000);
      const hours = String(minimumTime.getHours()).padStart(2, '0');
      const minutes = String(minimumTime.getMinutes()).padStart(2, '0');
      const minTimeStr = `${hours}:${minutes}`;
      timeInput.min = minTimeStr;
      
      // Show helpful message about minimum time
      const timeLabel = document.querySelector('label[for="scheduledTime"]');
      if (timeLabel && !timeLabel.querySelector('.time-hint')) {
        const hint = document.createElement('small');
        hint.className = 'time-hint';
        hint.style.cssText = 'color: #3b82f6; font-weight: normal; margin-left: 0.5rem;';
        hint.textContent = `(earliest: ${minTimeStr})`;
        timeLabel.appendChild(hint);
      } else if (timeLabel) {
        const existingHint = timeLabel.querySelector('.time-hint');
        if (existingHint) existingHint.textContent = `(earliest: ${minTimeStr})`;
      }
      
      // If current time value is less than minimum, clear it
      if (timeInput.value && timeInput.value < timeInput.min) {
        timeInput.value = '';
        setError('scheduledTime', 'Select a time at least 15 minutes from now');
      }
    } else {
      // For future dates, remove minimum time restriction
      timeInput.min = '';
      setError('scheduledTime', '');
      
      // Remove the time hint
      const timeLabel = document.querySelector('label[for="scheduledTime"]');
      const hint = timeLabel?.querySelector('.time-hint');
      if (hint) hint.remove();
    }
  }
  
  function validateSelectedTime() {
    const dateInput = document.getElementById('scheduledDate');
    const timeInput = document.getElementById('scheduledTime');
    
    if (!dateInput || !timeInput) return;
    
    const selectedDate = dateInput.value;
    const selectedTime = timeInput.value;
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedDate === today && selectedTime) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      const minimumBookingTime = new Date(now.getTime() + 15 * 60 * 1000);
      
      if (selectedDateTime < minimumBookingTime) {
        setError('scheduledTime', 'Select a time at least 15 minutes from now');
        return false;
      } else {
        setError('scheduledTime', '');
        return true;
      }
    }
    
    setError('scheduledTime', '');
    return true;
  }
  
  // Validation helpers
  function setError(field, message) {
    const small = document.querySelector(`[data-error-for="${field}"]`);
    if (small) small.textContent = message || '';
  }

  function validate() {
    let ok = true;
    const name = form.userName.value.trim();
    const phone = form.userPhone.value.trim();
    const email = form.userEmail.value.trim();
    const service = form.service.value;
    const garageId = form.garageId.value;
    const date = form.scheduledDate.value;
    const time = form.scheduledTime.value;

    setError('userName', '');
    setError('userPhone', '');
    setError('userEmail', '');
    setError('service', '');
    setError('garageId', '');
    setError('scheduledDate', '');
    setError('scheduledTime', '');

    if (name.length < 2) { setError('userName', 'Name must be at least 2 characters'); ok = false; }
    if (!/^\d{10,15}$/.test(phone)) { setError('userPhone', 'Enter a valid phone number (10-15 digits)'); ok = false; }
    
    // Email is now mandatory
    if (!email) { setError('userEmail', 'Email is required'); ok = false; }
    else if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) { setError('userEmail', 'Invalid email address'); ok = false; }
    
    if (!service) { setError('service', 'Select a service'); ok = false; }
    if (!garageId) { setError('garageId', 'Select a garage'); ok = false; }
    if (!date) { setError('scheduledDate', 'Select a date'); ok = false; }
    if (!time) { setError('scheduledTime', 'Select a time'); ok = false; }
    
    // Validate date and time combination
    if (date && time) {
      const selectedDateTime = new Date(`${date}T${time}`);
      const now = new Date();
      const minimumBookingTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
      
      if (selectedDateTime < minimumBookingTime) {
        const today = now.toISOString().split('T')[0];
        if (date === today) {
          setError('scheduledTime', 'For today\'s bookings, select a time at least 15 minutes from now');
        } else {
          setError('scheduledDate', 'Cannot book for past dates');
        }
        ok = false;
      }
    }

    return ok;
  }

  // Submit handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      userName: form.userName.value.trim(),
      userPhone: form.userPhone.value.trim(),
      userEmail: form.userEmail.value.trim(), // Email is now required
      service: form.service.value,
      garageId: form.garageId.value,
      scheduledDate: form.scheduledDate.value,
      scheduledTime: form.scheduledTime.value,
      notes: form.notes.value.trim() || undefined,
    };

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      console.log('🚀 Submitting booking with payload:', payload);
      console.log('🔗 API Endpoint:', ENDPOINTS.bookingCreate());
      
      const res = await bookingAPI.create(payload);
      console.log('✅ Booking API response:', res);
      const booking = res.booking;

      showSuccess(booking.bookingId);
    } catch (err) {
      console.error('❌ Booking submission failed:', {
        error: err.message,
        stack: err.stack,
        payload: payload
      });
      showToast(err.message || 'Booking failed', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Booking';
    }
  });

  function showSuccess(bookingId) {
    if (!successModal || !successText) return;
    successText.innerHTML = `✅ Booking Successful – Your booking ID is <strong>${bookingId}</strong>`;
    trackLink.href = `track-booking.html?bookingId=${encodeURIComponent(bookingId)}`;
    successModal.style.display = 'block';
  }

  document.body.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]') || e.target === successModal) {
      successModal.style.display = 'none';
    }
  });
})();

